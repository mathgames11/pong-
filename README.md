# Pong (HTML5)

Simple Pong game built with HTML5 Canvas + JavaScript.

How to run
- Download the files (index.html, style.css, script.js).
- Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

Controls
- Left paddle: W (up), S (down)
- Right paddle: Arrow Up, Arrow Down
- Toggle "Right paddle AI" to play against computer
- New Game: start/reset the game
- Pause: pause/resume the game

Notes
- Ball speed increases slightly on each paddle hit.
- First to reach 10 points wins (adjustable in script).
- Feel free to modify game parameters (speed, paddle size, winningScore) in script.js.
```markdown
# Pong (HTML5) — Sound, Mobile Controls & P2P Multiplayer

This is a lightweight Pong game using HTML5 Canvas and vanilla JavaScript.
Enhancements added:
- Sound effects via Web Audio API (no external audio files)
- Mobile touch controls (dragging the paddle, on-screen up/down buttons)
- Peer-to-peer multiplayer using WebRTC DataChannel with manual SDP copy/paste (no server required)
- Local play / AI toggle remains available

How to run
- Download the files (index.html, style.css, script.js).
- Open `index.html` in a modern browser (Chrome, Firefox, Edge). Mobile browsers supported.
- For better audio experience, allow the page to play audio (some browsers require a user gesture first).

Controls
- Left paddle: W (up), S (down)
- Right paddle: Arrow Up, Arrow Down
- Mobile: touch and drag on left/right halves of the canvas, or use the on-screen up/down buttons
- Toggle "Right paddle AI" to play against computer
- New Game: start/reset the game
- Pause: pause/resume the game
- Sound: toggle sound on/off
- Mobile Controls: toggle on-screen touch controls

Multiplayer (Peer-to-peer manual SDP)
- The multiplayer UI provides a manual SDP exchange so you don't need a signaling server.
- One player chooses "Host (create offer)":
  - Click "Host (create offer)". Copy the resulting "Local SDP" text and give it to the joiner (e.g., via chat).
  - The joiner pastes that offer into the "Remote SDP" box and clicks "Join".
  - The joiner will then get a "Local SDP" (the answer). They copy that back to the host's "Remote SDP" box.
  - The host clicks "Set remote answer" to finish the handshake.
- After the DataChannel opens:
  - The host runs the authoritative simulation and sends state updates to the client.
  - The client sends its paddle input to the host.
- Notes:
  - This manual flow is intended for ad-hoc peer connections and testing. For production or easier UX, use a small signaling server to exchange SDP automatically.
  - NAT/firewall traversal is subject to typical WebRTC/STUN constraints. Using TURN servers will help in restrictive networks.

Architecture notes
- Host is authoritative: it runs the physics and sends state to client (state includes paddles and ball positions and scores).
- Client renders received state and sends its input (paddle Y) to host.
- Audio is generated with Web Audio API, so no external assets required.

