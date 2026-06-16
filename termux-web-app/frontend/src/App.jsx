import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const ws = new WebSocket(`wss://${window.location.host}/ws`);
    ws.onmessage = (e) => setMsg((prev) => `${prev}\n${e.data}`);
    ws.onopen = () => ws.send("Hello from browser!");
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Termux‑Hosted PWA</h1>
        <p>Live backend: <code>/api/ping</code></p>
      </header>
      <main>
        <p>WebSocket echo: {msg}</p>
        <button onClick={() => setMsg("")}>Clear</button>
      </main>
    </div>
  );
}

export default App;