use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;

static ENGINE_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

fn is_engine_running() -> bool {
  TcpStream::connect_timeout(
    &"127.0.0.1:3456".parse().unwrap(),
    Duration::from_millis(350),
  )
  .is_ok()
}

fn try_start_engine() {
  if is_engine_running() {
    println!("[FlowSnap Rust] Engine is already running on 127.0.0.1:3456");
    return;
  }

  println!("[FlowSnap Rust] Spawning FlowSnap Engine...");
  let candidates = [
    "src/server.mjs",
    "../src/server.mjs",
    "resources/src/server.mjs",
  ];

  for path in candidates {
    if std::path::Path::new(path).exists() {
      println!("[FlowSnap Rust] Found server script at: {}", path);
      match Command::new("node").arg(path).arg("--port").arg("3456").spawn() {
        Ok(child) => {
          println!("[FlowSnap Rust] Engine spawned successfully with PID {}", child.id());
          let mut lock = ENGINE_PROCESS.lock().unwrap();
          *lock = Some(child);
          return;
        }
        Err(e) => {
          eprintln!("[FlowSnap Rust] Failed to spawn node: {}", e);
        }
      }
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      try_start_engine();
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
