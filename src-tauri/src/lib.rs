use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

static ENGINE_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

fn is_engine_running() -> bool {
  TcpStream::connect_timeout(
    &"127.0.0.1:3456".parse().unwrap(),
    Duration::from_millis(350),
  )
  .is_ok()
}

fn try_start_engine(app: &tauri::App) {
  if is_engine_running() {
    println!("[FlowSnap Rust] Engine is already running on 127.0.0.1:3456");
    return;
  }

  println!("[FlowSnap Rust] Detecting engine runtime & server script...");

  let exe_dir = std::env::current_exe()
    .ok()
    .and_then(|p| p.parent().map(|p| p.to_path_buf()))
    .unwrap_or_else(|| PathBuf::from("."));
  let resource_dir = app.path().resource_dir().unwrap_or_else(|_| PathBuf::from("."));
  println!("[FlowSnap Rust] Exe dir: {:?}, Resource dir: {:?}", exe_dir, resource_dir);

  // 1. Candidate paths for node executable:
  let mut node_bin = PathBuf::from("node");
  let node_candidates = [
    resource_dir.join("resources").join(if cfg!(windows) { "node.exe" } else { "node" }),
    resource_dir.join(if cfg!(windows) { "node.exe" } else { "node" }),
    exe_dir.join("resources").join(if cfg!(windows) { "node.exe" } else { "node" }),
    exe_dir.join(if cfg!(windows) { "node.exe" } else { "node" }),
  ];

  for cand in &node_candidates {
    if cand.exists() {
      node_bin = cand.clone();
      println!("[FlowSnap Rust] Found bundled node runtime: {:?}", node_bin);
      break;
    }
  }

  // 2. Candidate paths for server.mjs
  // In dev mode (debug_assertions), prioritize live workspace source code so changes apply immediately!
  let server_candidates = if cfg!(debug_assertions) {
    vec![
      PathBuf::from("../src/server.mjs"),
      PathBuf::from("src/server.mjs"),
      resource_dir.join("resources").join("src").join("server.mjs"),
      resource_dir.join("src").join("server.mjs"),
      exe_dir.join("resources").join("src").join("server.mjs"),
    ]
  } else {
    vec![
      resource_dir.join("resources").join("src").join("server.mjs"),
      resource_dir.join("src").join("server.mjs"),
      exe_dir.join("resources").join("src").join("server.mjs"),
      exe_dir.join("src").join("server.mjs"),
      PathBuf::from("../src/server.mjs"),
      PathBuf::from("src/server.mjs"),
    ]
  };

  for script in &server_candidates {
    if script.exists() {
      println!("[FlowSnap Rust] Found server script: {:?}", script);
      let working_dir = script.parent().and_then(|p| p.parent()).unwrap_or(Path::new("."));

      let mut cmd = Command::new(&node_bin);
      cmd.arg(script).arg("--port").arg("3456");
      cmd.current_dir(working_dir);

      #[cfg(windows)]
      {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
      }

      match cmd.spawn() {
        Ok(child) => {
          println!("[FlowSnap Rust] Engine spawned successfully with PID {}", child.id());
          let mut lock = ENGINE_PROCESS.lock().unwrap();
          *lock = Some(child);
          return;
        }
        Err(e) => {
          eprintln!("[FlowSnap Rust] Failed to spawn node at {:?}: {}", node_bin, e);
        }
      }
    }
  }

  eprintln!("[FlowSnap Rust] No valid server.mjs found among candidates.");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      try_start_engine(app);
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|_window, event| {
      if let tauri::WindowEvent::Destroyed = event {
        let mut lock = ENGINE_PROCESS.lock().unwrap();
        if let Some(mut child) = lock.take() {
          println!("[FlowSnap Rust] Terminating background engine process...");
          let _ = child.kill();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
