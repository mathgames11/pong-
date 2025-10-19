// Simple Pong implementation
// Controls: Left -> W/S ; Right -> ArrowUp/ArrowDown
// Toggle AI with the checkbox in the UI

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const btnNew = document.getElementById('btn-new');
  const btnPause = document.getElementById('btn-pause');
  const aiToggle = document.getElementById('ai-toggle');
  const statusEl = document.getElementById('status');

  const W = canvas.width;
  const H = canvas.height;

  // Game parameters
  const paddleWidth = 12;
  const paddleHeight = 100;
  const paddleSpeed = 6;
  const ballRadius = 8;
  const initialBallSpeed = 4;
  const speedIncrease = 0.2;
  const winningScore = 10;

  // Game state
  let left = {
    x: 20,
    y: H / 2 - paddleHeight / 2,
    dy: 0,
    score: 0,
  };
  let right = {
    x: W - 20 - paddleWidth,
    y: H / 2 - paddleHeight / 2,
    dy: 0,
    score: 0,
  };
  let ball = {
    x: W / 2,
    y: H / 2,
    vx: initialBallSpeed,
    vy: 0,
    speed: initialBallSpeed,
  };

  let keys = {};
  let loopId = null;
  let running = false;
  let paused = false;

  function resetBall(servingToLeft = false) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.speed = initialBallSpeed;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // small angle
    ball.vx = (servingToLeft ? -1 : 1) * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function newGame() {
    left.score = 0;
    right.score = 0;
    left.y = H / 2 - paddleHeight / 2;
    right.y = H / 2 - paddleHeight / 2;
    resetBall(Math.random() < 0.5);
    running = true;
    paused = false;
    btnPause.textContent = 'Pause';
    statusEl.textContent = 'Game started';
    if (!loopId) requestFrame();
  }

  function pauseToggle() {
    if (!running) return;
    paused = !paused;
    btnPause.textContent = paused ? 'Resume' : 'Pause';
    statusEl.textContent = paused ? 'Paused' : '';
    if (!paused && !loopId) requestFrame();
  }

  function requestFrame() {
    loopId = requestAnimationFrame(loop);
  }

  function stopFrame() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function loop() {
    loopId = null;
    if (!running) return;
    if (!paused) {
      update();
      render();
    }
    requestFrame();
  }

  function update() {
    // Player input
    // Left paddle (W/S)
    if (keys['KeyW']) left.y -= paddleSpeed;
    if (keys['KeyS']) left.y += paddleSpeed;

    // Right paddle (Up/Down)
    if (!aiToggle.checked) {
      if (keys['ArrowUp']) right.y -= paddleSpeed;
      if (keys['ArrowDown']) right.y += paddleSpeed;
    } else {
      // Simple AI: follow ball with limited speed
      const center = right.y + paddleHeight / 2;
      if (ball.y < center - 10) right.y -= paddleSpeed * 0.9;
      if (ball.y > center + 10) right.y += paddleSpeed * 0.9;
      // limit AI maximum speed
      right.y = clamp(right.y, 0, H - paddleHeight);
    }

    // Clamp paddles
    left.y = clamp(left.y, 0, H - paddleHeight);
    right.y = clamp(right.y, 0, H - paddleHeight);

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom collision
    if (ball.y - ballRadius <= 0) {
      ball.y = ballRadius;
      ball.vy *= -1;
    }
    if (ball.y + ballRadius >= H) {
      ball.y = H - ballRadius;
      ball.vy *= -1;
    }

    // Paddle collisions
    // Left paddle
    if (ball.x - ballRadius <= left.x + paddleWidth) {
      if (ball.y >= left.y && ball.y <= left.y + paddleHeight) {
        // collision
        ball.x = left.x + paddleWidth + ballRadius; // avoid sticking
        reflectFromPaddle(left);
      } else if (ball.x + ballRadius < 0) {
        // Missed - right scores
        scorePoint('right');
      }
    }

    // Right paddle
    if (ball.x + ballRadius >= right.x) {
      if (ball.y >= right.y && ball.y <= right.y + paddleHeight) {
        ball.x = right.x - ballRadius;
        reflectFromPaddle(right);
      } else if (ball.x - ballRadius > W) {
        // Missed - left scores
        scorePoint('left');
      }
    }
  }

  function reflectFromPaddle(paddle) {
    // compute relative hit position (-1 .. 1)
    const relative = (ball.y - (paddle.y + paddleHeight / 2)) / (paddleHeight / 2);
    // clamp
    const clipped = Math.max(-1, Math.min(1, relative));
    // angle range: 45deg up to 60deg depending on hit
    const maxBounce = Math.PI / 3; // 60deg
    const bounceAngle = clipped * maxBounce;
    // direction: left paddle -> to the right, right paddle -> to left
    const direction = (paddle === left) ? 1 : -1;
    // increase speed
    ball.speed += speedIncrease;
    ball.vx = direction * ball.speed * Math.cos(bounceAngle);
    ball.vy = ball.speed * Math.sin(bounceAngle);
    // small nudge to prevent immediate re-collision
    ball.x += ball.vx * 0.5;
  }

  function scorePoint(side) {
    if (side === 'left') left.score += 1;
    else right.score += 1;

    if (left.score >= winningScore || right.score >= winningScore) {
      running = false;
      statusEl.textContent = (left.score > right.score) ? 'Left Player wins!' : 'Right Player wins!';
      return;
    }

    // Serve to the player who conceded the point (so ball moves toward the scorer)
    const servingToLeft = (side === 'left') ? false : true;
    resetBall(servingToLeft);
    // brief pause
    paused = true;
    btnPause.textContent = 'Resume';
    setTimeout(() => {
      paused = false;
      btnPause.textContent = 'Pause';
    }, 700);
  }

  function renderNet() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    // background
    ctx.clearRect(0, 0, W, H);

    // center glow
    const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H));
    g.addColorStop(0, 'rgba(109,194,160,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // net
    renderNet();

    // paddles
    ctx.fillStyle = '#bfead1';
    roundRect(ctx, left.x, left.y, paddleWidth, paddleHeight, 4, true);
    roundRect(ctx, right.x, right.y, paddleWidth, paddleHeight, 4, true);

    // ball
    ctx.beginPath();
    ctx.fillStyle = '#6ee7b7';
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // scores
    ctx.fillStyle = '#e6eef6';
    ctx.font = '40px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(left.score, W * 0.25, 60);
    ctx.fillText(right.score, W * 0.75, 60);

    // small helper text
    ctx.font = '12px system-ui, Arial';
    ctx.fillStyle = 'rgba(230,238,246,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('First to ' + winningScore + ' wins', W / 2, H - 14);
  }

  // Helper: rounded rect
  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    else ctx.stroke();
  }

  // Input
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // space to pause
    if (e.code === 'Space') {
      e.preventDefault();
      pauseToggle();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // UI buttons
  btnNew.addEventListener('click', newGame);
  btnPause.addEventListener('click', pauseToggle);

  // initial render
  render();

  // start loop but not running until New Game
  function startLoopAlways() {
    if (!loopId) requestFrame();
  }
  startLoopAlways();

  // Expose nothing global; done.
})();
// Pong with Sound, Mobile Controls, and P2P Multiplayer (manual SDP)
// Controls: Left -> W/S ; Right -> ArrowUp/ArrowDown
// Toggle AI with the checkbox in the UI
// Multiplayer: host is authoritative; client receives state and sends inputs via DataChannel

(() => {
  // DOM
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const btnNew = document.getElementById('btn-new');
  const btnPause = document.getElementById('btn-pause');
  const aiToggle = document.getElementById('ai-toggle');
  const statusEl = document.getElementById('status');

  const soundToggle = document.getElementById('sound-toggle');
  const mobileToggle = document.getElementById('mobile-toggle');

  // multiplayer UI
  const btnHost = document.getElementById('btn-host');
  const btnJoin = document.getElementById('btn-join');
  const btnSetRemoteAnswer = document.getElementById('btn-set-remote-answer');
  const localSdp = document.getElementById('local-sdp');
  const remoteSdp = document.getElementById('remote-sdp');
  const mpStatus = document.getElementById('mp-status');

  // touch elements
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');

  const W = canvas.width;
  const H = canvas.height;

  // Game parameters
  const paddleWidth = 12;
  const paddleHeight = 100;
  const paddleSpeed = 6;
  const ballRadius = 8;
  const initialBallSpeed = 4;
  const speedIncrease = 0.2;
  const winningScore = 10;
  const stateSendHz = 30; // host sends state at ~30Hz

  // Game state (host authoritative)
  let left = { x: 20, y: H / 2 - paddleHeight / 2, dy: 0, score: 0 };
  let right = { x: W - 20 - paddleWidth, y: H / 2 - paddleHeight / 2, dy: 0, score: 0 };
  let ball = { x: W / 2, y: H / 2, vx: initialBallSpeed, vy: 0, speed: initialBallSpeed };

  let keys = {};
  let loopId = null;
  let running = false;
  let paused = false;
  let lastStateSend = 0;

  // Multiplayer state
  let isHost = false;
  let isClient = false;
  let pc = null;
  let dc = null;
  let clientInput = { y: H/2 - paddleHeight/2 }; // client's paddle y (right side if client)
  let networkReady = false;
  let lastReceivedState = null;
  let renderInterpolation = true;

  // Audio setup
  let audioCtx = null;
  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
  function beep(type = 'hit') {
    if (!soundToggle.checked) return;
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = (type === 'score') ? 'sine' : 'square';
    if (type === 'hit') o.frequency.setValueAtTime(600, now);
    else if (type === 'score') o.frequency.setValueAtTime(260, now);
    else if (type === 'wall') o.frequency.setValueAtTime(220, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now); o.stop(now + 0.2);
  }

  // reset initial ball
  function resetBall(servingToLeft = false) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.speed = initialBallSpeed;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8);
    ball.vx = (servingToLeft ? -1 : 1) * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function newGame() {
    left.score = 0;
    right.score = 0;
    left.y = H / 2 - paddleHeight / 2;
    right.y = H / 2 - paddleHeight / 2;
    resetBall(Math.random() < 0.5);
    running = true;
    paused = false;
    btnPause.textContent = 'Pause';
    statusEl.textContent = 'Game started' + (isHost ? ' (hosting)' : isClient ? ' (client)' : '');
    if (!loopId) requestFrame();
  }

  function pauseToggle() {
    if (!running) return;
    paused = !paused;
    btnPause.textContent = paused ? 'Resume' : 'Pause';
    statusEl.textContent = paused ? 'Paused' : '';
    if (!paused && !loopId) requestFrame();
  }

  function requestFrame() {
    loopId = requestAnimationFrame(loop);
  }

  function stopFrame() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Host: update authoritative state
  function updateHost(dt) {
    // Player input
    if (keys['KeyW']) left.y -= paddleSpeed;
    if (keys['KeyS']) left.y += paddleSpeed;

    if (!aiToggle.checked) {
      if (keys['ArrowUp']) right.y -= paddleSpeed;
      if (keys['ArrowDown']) right.y += paddleSpeed;
    } else {
      // simple AI
      const center = right.y + paddleHeight / 2;
      if (ball.y < center - 10) right.y -= paddleSpeed * 0.9;
      if (ball.y > center + 10) right.y += paddleSpeed * 0.9;
      right.y = clamp(right.y, 0, H - paddleHeight);
    }

    // If client connected and not using AI, accept client's input for one side (we'll assume client is right player)
    if (isHost && isClient && dc && dc.readyState === 'open' && !aiToggle.checked) {
      // clientInput.y is updated when client sends input
      // Smoothly move right paddle toward client input to account for latency
      const targetY = clamp(clientInput.y, 0, H - paddleHeight);
      right.y += (targetY - right.y) * 0.6; // smoothing
    }

    // Clamp paddles
    left.y = clamp(left.y, 0, H - paddleHeight);
    right.y = clamp(right.y, 0, H - paddleHeight);

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom collision
    if (ball.y - ballRadius <= 0) {
      ball.y = ballRadius;
      ball.vy *= -1;
      beep('wall');
    }
    if (ball.y + ballRadius >= H) {
      ball.y = H - ballRadius;
      ball.vy *= -1;
      beep('wall');
    }

    // Paddle collisions
    // Left paddle
    if (ball.x - ballRadius <= left.x + paddleWidth) {
      if (ball.y >= left.y && ball.y <= left.y + paddleHeight) {
        ball.x = left.x + paddleWidth + ballRadius;
        reflectFromPaddle(left);
        beep('hit');
      } else if (ball.x + ballRadius < 0) {
        scorePoint('right');
      }
    }

    // Right paddle
    if (ball.x + ballRadius >= right.x) {
      if (ball.y >= right.y && ball.y <= right.y + paddleHeight) {
        ball.x = right.x - ballRadius;
        reflectFromPaddle(right);
        beep('hit');
      } else if (ball.x - ballRadius > W) {
        scorePoint('left');
      }
    }
  }

  function reflectFromPaddle(paddle) {
    const relative = (ball.y - (paddle.y + paddleHeight / 2)) / (paddleHeight / 2);
    const clipped = Math.max(-1, Math.min(1, relative));
    const maxBounce = Math.PI / 3;
    const bounceAngle = clipped * maxBounce;
    const direction = (paddle === left) ? 1 : -1;
    ball.speed += speedIncrease;
    ball.vx = direction * ball.speed * Math.cos(bounceAngle);
    ball.vy = ball.speed * Math.sin(bounceAngle);
    ball.x += ball.vx * 0.5;
  }

  function scorePoint(side) {
    if (side === 'left') left.score += 1;
    else right.score += 1;
    beep('score');

    if (left.score >= winningScore || right.score >= winningScore) {
      running = false;
      statusEl.textContent = (left.score > right.score) ? 'Left Player wins!' : 'Right Player wins!';
      // notify client if connected
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'gameover', winner: left.score > right.score ? 'left' : 'right' }));
      }
      return;
    }

    const servingToLeft = (side === 'left') ? false : true;
    resetBall(servingToLeft);
    paused = true;
    btnPause.textContent = 'Resume';
    setTimeout(() => {
      paused = false;
      btnPause.textContent = 'Pause';
    }, 700);
  }

  function updateClientRender() {
    // Client does not simulate game; it just renders the last received state.
    if (!lastReceivedState) return;
    // simple interpolation could be added; for now render directly
    left.y = lastReceivedState.left.y;
    left.score = lastReceivedState.left.score;
    right.y = lastReceivedState.right.y;
    right.score = lastReceivedState.right.score;
    ball.x = lastReceivedState.ball.x;
    ball.y = lastReceivedState.ball.y;
  }

  function loop(ts) {
    loopId = null;
    if (!running) return;
    if (!paused) {
      // choose host or client behavior
      if (isHost) {
        updateHost(0);
        // send state periodically
        const now = performance.now();
        if (dc && dc.readyState === 'open' && now - lastStateSend > (1000 / stateSendHz)) {
          const payload = {
            type: 'state',
            left: { y: left.y, score: left.score },
            right: { y: right.y, score: right.score },
            ball: { x: ball.x, y: ball.y },
            ts: Date.now()
          };
          try {
            dc.send(JSON.stringify(payload));
          } catch (e) {
            console.warn('send failed', e);
          }
          lastStateSend = now;
        }
      } else if (isClient) {
        // client send its input to host
        if (dc && dc.readyState === 'open') {
          try {
            dc.send(JSON.stringify({ type: 'input', y: clientInput.y }));
          } catch (e) {}
        }
        updateClientRender();
      } else {
        // standalone local (no network): original update
        updateHost(0);
      }

      render();
    }
    requestFrame();
  }

  // Render
  function renderNet() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H));
    g.addColorStop(0, 'rgba(109,194,160,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    renderNet();

    ctx.fillStyle = '#bfead1';
    roundRect(ctx, left.x, left.y, paddleWidth, paddleHeight, 4, true);
    roundRect(ctx, right.x, right.y, paddleWidth, paddleHeight, 4, true);

    ctx.beginPath();
    ctx.fillStyle = '#6ee7b7';
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e6eef6';
    ctx.font = '40px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(left.score, W * 0.25, 60);
    ctx.fillText(right.score, W * 0.75, 60);

    ctx.font = '12px system-ui, Arial';
    ctx.fillStyle = 'rgba(230,238,246,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('First to ' + winningScore + ' wins', W / 2, H - 14);
  }

  // Helper: rounded rect
  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    else ctx.stroke();
  }

  // Inputs: keyboard
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
      e.preventDefault();
      pauseToggle();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Touch controls: dragging and buttons
  function setupTouchPads() {
    // visible only when mobileToggle is checked or small screen
    function updatePadVisibility() {
      const show = mobileToggle.checked || window.innerWidth < 900;
      touchLeft.style.display = show ? 'flex' : 'none';
      touchRight.style.display = show ? 'flex' : 'none';
    }
    mobileToggle.addEventListener('change', updatePadVisibility);
    updatePadVisibility();

    // dragging: when touching left/right area, move that paddle to finger y
    function touchToY(e, side) {
      const rect = canvas.getBoundingClientRect();
      let clientY = null;
      if (e.touches && e.touches.length) clientY = e.touches[0].clientY;
      else if (e.changedTouches && e.changedTouches.length) clientY = e.changedTouches[0].clientY;
      else clientY = e.clientY;
      const y = clientY - rect.top - paddleHeight / 2;
      if (side === 'left') {
        left.y = clamp(y, 0, H - paddleHeight);
      } else {
        // right paddle control: if client in multiplayer, send input to host; otherwise set right.y
        const target = clamp(y, 0, H - paddleHeight);
        if (isClient) {
          clientInput.y = target;
        } else {
          right.y = target;
        }
      }
    }

    // drag on canvas
    canvas.addEventListener('touchstart', (ev) => {
      ev.preventDefault();
      for (let t of ev.touches) {
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        const side = x < rect.width / 2 ? 'left' : 'right';
        const fake = { touches: [t] };
        touchToY(fake, side);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (ev) => {
      ev.preventDefault();
      for (let t of ev.touches) {
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        const side = x < rect.width / 2 ? 'left' : 'right';
        const fake = { touches: [t] };
        touchToY(fake, side);
      }
    }, { passive: false });

    // on-screen up/down buttons (tap)
    function setupPadButtons(container, side) {
      const up = container.querySelector('.control-btn.up');
      const down = container.querySelector('.control-btn.down');
      let interval = null;

      function start(dir) {
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          if (side === 'left') {
            left.y += dir === 'up' ? -paddleSpeed : paddleSpeed;
            left.y = clamp(left.y, 0, H - paddleHeight);
          } else {
            if (isClient) {
              clientInput.y += dir === 'up' ? -paddleSpeed : paddleSpeed;
              clientInput.y = clamp(clientInput.y, 0, H - paddleHeight);
            } else {
              right.y += dir === 'up' ? -paddleSpeed : paddleSpeed;
              right.y = clamp(right.y, 0, H - paddleHeight);
            }
          }
        }, 50);
      }
      function stop() { if (interval) clearInterval(interval); interval = null; }

      up.addEventListener('touchstart', (e)=>{ e.preventDefault(); start('up'); });
      up.addEventListener('touchend', (e)=>{ e.preventDefault(); stop(); });
      down.addEventListener('touchstart', (e)=>{ e.preventDefault(); start('down'); });
      down.addEventListener('touchend', (e)=>{ e.preventDefault(); stop(); });

      // also mouse support for convenience
      up.addEventListener('mousedown', ()=>start('up'));
      up.addEventListener('mouseup', stop);
      down.addEventListener('mousedown', ()=>start('down'));
      down.addEventListener('mouseup', stop);
      // stop on leave
      container.addEventListener('mouseleave', stop);
    }
    setupPadButtons(touchLeft, 'left');
    setupPadButtons(touchRight, 'right');
  }

  setupTouchPads();

  // Multiplayer: simple WebRTC DataChannel manual SDP (no signaling server)
  // Host: createOffer -> paste offer to remote; remote (joiner) pastes offer, createAnswer, send answer back
  function setMpStatus(s) { mpStatus.textContent = 'P2P: ' + s; }

  async function createPeerConnection() {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
    const connection = new RTCPeerConnection(config);

    connection.oniceconnectionstatechange = () => {
      setMpStatus('ICE ' + connection.iceConnectionState);
    };

    connection.onconnectionstatechange = () => {
      setMpStatus('Conn ' + connection.connectionState);
    };

    connection.onicecandidate = (ev) => {
      // we will rely on full SDP copy/paste; nothing needed here besides collecting final local description
    };

    return connection;
  }

  function setupHostDataChannel(channel) {
    dc = channel;
    dc.onopen = () => {
      setMpStatus('DataChannel open (host)');
      networkReady = true;
      isHost = true;
      isClient = false;
      // once client connected, host should be authoritative
      statusEl.textContent = 'Hosting - client connected';
    };
    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'input') {
          // client sent its paddle y
          clientInput.y = msg.y;
        } else if (msg.type === 'ready') {
          // client indicates ready
        }
      } catch (e) { console.warn('bad mp msg', e); }
    };
    dc.onclose = () => {
      setMpStatus('DataChannel closed');
      networkReady = false;
    };
  }

  function setupClientDataChannelHandlers(connection) {
    connection.ondatachannel = (ev) => {
      dc = ev.channel;
      dc.onopen = () => {
        setMpStatus('DataChannel open (client)');
        networkReady = true;
        isClient = true;
        isHost = false;
        statusEl.textContent = 'Joined - connected to host';
        // inform host that we're ready (optional)
        try { dc.send(JSON.stringify({type:'ready'})); } catch (e) {}
      };
      dc.onmessage = (ev2) => {
        try {
          const msg = JSON.parse(ev2.data);
          if (msg.type === 'state') {
            lastReceivedState = msg;
          } else if (msg.type === 'gameover') {
            running = false;
            statusEl.textContent = msg.winner === 'left' ? 'Left Player wins!' : 'Right Player wins!';
          }
        } catch (e) { /* ignore */ }
      };
      dc.onclose = () => {
        setMpStatus('DataChannel closed');
        networkReady = false;
      };
    };
  }

  btnHost.addEventListener('click', async () => {
    try {
      pc = await createPeerConnection();
      // host creates data channel
      const channel = pc.createDataChannel('pong');
      setupHostDataChannel(channel);
      setupClientDataChannelHandlers(pc); // still necessary if host receives channels (rare)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // Wait for ICE gather to complete for a nicer copy/paste SDP. We'll wait briefly and then show the SDP.
      setMpStatus('Creating offer...');
      await waitForIceGatheringComplete(pc, 1500);
      localSdp.value = pc.localDescription.sdp;
      setMpStatus('Offer created — share Local SDP with joiner and paste answer into Remote SDP');
      isHost = true;
      isClient = false;
    } catch (e) {
      console.error(e);
      setMpStatus('Host creation failed');
    }
  });

  btnSetRemoteAnswer.addEventListener('click', async () => {
    if (!pc) { setMpStatus('No peer connection (create host first)'); return; }
    const remote = remoteSdp.value.trim();
    if (!remote) { setMpStatus('Paste remote answer into Remote SDP'); return; }
    try {
      await pc.setRemoteDescription({ type: 'answer', sdp: remote });
      setMpStatus('Remote answer set — waiting for datachannel to open');
    } catch (e) {
      console.error(e);
      setMpStatus('Failed to set remote answer: ' + e.message);
    }
  });

  btnJoin.addEventListener('click', async () => {
    const offer = remoteSdp.value.trim();
    if (!offer) { setMpStatus('Paste host offer into Remote SDP then click Join'); return; }
    try {
      pc = await createPeerConnection();
      setupClientDataChannelHandlers(pc);

      await pc.setRemoteDescription({ type: 'offer', sdp: offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc, 1500);
      localSdp.value = pc.localDescription.sdp;
      setMpStatus('Answer created — copy Local SDP back to host');
      isClient = true;
      isHost = false;
    } catch (e) {
      console.error(e);
      setMpStatus('Join failed: ' + e.message);
    }
  });

  // helper to wait for ICE gathering
  function waitForIceGatheringComplete(connection, timeout = 2000) {
    return new Promise((resolve) => {
      if (connection.iceGatheringState === 'complete') return resolve();
      const check = () => {
        if (connection.iceGatheringState === 'complete') {
          cleanup();
          resolve();
        }
      };
      const onstate = () => check();
      const to = setTimeout(() => { cleanup(); resolve(); }, timeout);
      function cleanup() {
        clearTimeout(to);
        connection.removeEventListener('icegatheringstatechange', onstate);
      }
      connection.addEventListener('icegatheringstatechange', onstate);
      check();
    });
  }

  // initial render
  render();

  // UI buttons
  btnNew.addEventListener('click', () => {
    // if joining as client, don't start local simulation; we wait for host state
    if (isClient) {
      statusEl.textContent = 'Waiting for host state...';
      running = true;
      paused = false;
      if (!loopId) requestFrame();
    } else {
      newGame();
    }
  });
  btnPause.addEventListener('click', pauseToggle);

  // network cleanup on unload
  window.addEventListener('beforeunload', () => {
    try { if (dc) dc.close(); } catch(e){}
    try { if (pc) pc.close(); } catch(e){}
  });

  // Client input handlers (keyboard + touch)
  // override right paddle keyboard to send input when client
  window.addEventListener('keydown', (e) => {
    if (isClient && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
      // prevent local default movement
      keys[e.code] = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (isClient && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
      keys[e.code] = false;
    }
  });

  // Allow client to update clientInput via keyboard if desired
  setInterval(() => {
    if (!isClient) return;
    if (keys['ArrowUp']) clientInput.y -= paddleSpeed;
    if (keys['ArrowDown']) clientInput.y += paddleSpeed;
    clientInput.y = clamp(clientInput.y, 0, H - paddleHeight);
  }, 40);

  // expose simple debug controls for mobile: clicking the canvas moves the corresponding paddle
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - paddleHeight / 2;
    if (x < rect.width / 2) left.y = clamp(y, 0, H - paddleHeight);
    else {
      if (isClient) clientInput.y = clamp(y, 0, H - paddleHeight);
      else right.y = clamp(y, 0, H - paddleHeight);
    }
  });

  // Provide visual toggle for touchpads when small screen
  function adaptTouchPadVisibility() {
    const show = mobileToggle.checked || window.innerWidth < 900;
    touchLeft.style.display = show ? 'flex' : 'none';
    touchRight.style.display = show ? 'flex' : 'none';
  }
  window.addEventListener('resize', adaptTouchPadVisibility);
  adaptTouchPadVisibility();

  // Final: start the animation loop so UI is responsive (not simulating until newGame)
  function startLoopAlways() {
    if (!loopId) requestFrame();
  }
  startLoopAlways();

  // Narration helper (update status)
  function info(msg) {
    statusEl.textContent = msg;
  }
})();
// Pong with Sound, Mobile Controls, and P2P Multiplayer (manual SDP)
// Controls: Left -> W/S ; Right -> ArrowUp/ArrowDown
// Toggle AI with the checkbox in the UI
// Multiplayer: host is authoritative; client receives state and sends inputs via DataChannel

(() => {
  // DOM
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const btnNew = document.getElementById('btn-new');
  const btnPause = document.getElementById('btn-pause');
  const aiToggle = document.getElementById('ai-toggle');
  const statusEl = document.getElementById('status');

  const soundToggle = document.getElementById('sound-toggle');
  const mobileToggle = document.getElementById('mobile-toggle');

  // multiplayer UI
  const btnHost = document.getElementById('btn-host');
  const btnJoin = document.getElementById('btn-join');
  const btnSetRemoteAnswer = document.getElementById('btn-set-remote-answer');
  const localSdp = document.getElementById('local-sdp');
  const remoteSdp = document.getElementById('remote-sdp');
  const mpStatus = document.getElementById('mp-status');

  // touch elements
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');

  const W = canvas.width;
  const H = canvas.height;

  // Game parameters
  const paddleWidth = 12;
  const paddleHeight = 100;
  const paddleSpeed = 6;
  const ballRadius = 8;
  const initialBallSpeed = 4;
  const speedIncrease = 0.2;
  const winningScore = 10;
  const stateSendHz = 30; // host sends state at ~30Hz

  // Game state (host authoritative)
  let left = { x: 20, y: H / 2 - paddleHeight / 2, dy: 0, score: 0 };
  let right = { x: W - 20 - paddleWidth, y: H / 2 - paddleHeight / 2, dy: 0, score: 0 };
  let ball = { x: W / 2, y: H / 2, vx: initialBallSpeed, vy: 0, speed: initialBallSpeed };

  let keys = {};
  let loopId = null;
  let running = false;
  let paused = false;
  let lastStateSend = 0;

  // Multiplayer state
  let isHost = false;
  let isClient = false;
  let pc = null;
  let dc = null;
  let clientInput = { y: H/2 - paddleHeight/2 }; // client's paddle y (right side if client)
  let networkReady = false;
  let lastReceivedState = null;

  // Audio setup
  let audioCtx = null;
  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
  function beep(type = 'hit') {
    if (!soundToggle.checked) return;
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = (type === 'score') ? 'sine' : 'square';
    if (type === 'hit') o.frequency.setValueAtTime(600, now);
    else if (type === 'score') o.frequency.setValueAtTime(260, now);
    else if (type === 'wall') o.frequency.setValueAtTime(220, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now); o.stop(now + 0.2);
  }

  // reset initial ball
  function resetBall(servingToLeft = false) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.speed = initialBallSpeed;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8);
    ball.vx = (servingToLeft ? -1 : 1) * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function newGame() {
    left.score = 0;
    right.score = 0;
    left.y = H / 2 - paddleHeight / 2;
    right.y = H / 2 - paddleHeight / 2;
    resetBall(Math.random() < 0.5);
    running = true;
    paused = false;
    btnPause.textContent = 'Pause';
    statusEl.textContent = 'Game started' + (isHost ? ' (hosting)' : isClient ? ' (client)' : '');
    if (!loopId) requestFrame();
  }

  function pauseToggle() {
    if (!running) return;
    paused = !paused;
    btnPause.textContent = paused ? 'Resume' : 'Pause';
    statusEl.textContent = paused ? 'Paused' : '';
    if (!paused && !loopId) requestFrame();
  }

  function requestFrame() {
    loopId = requestAnimationFrame(loop);
  }

  function stopFrame() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Host: update authoritative state
  function updateHost(dt) {
    // Player input
    if (keys['KeyW']) left.y -= paddleSpeed;
    if (keys['KeyS']) left.y += paddleSpeed;

    if (!aiToggle.checked) {
      if (keys['ArrowUp']) right.y -= paddleSpeed;
      if (keys['ArrowDown']) right.y += paddleSpeed;
    } else {
      // simple AI
      const center = right.y + paddleHeight / 2;
      if (ball.y < center - 10) right.y -= paddleSpeed * 0.9;
      if (ball.y > center + 10) right.y += paddleSpeed * 0.9;
      right.y = clamp(right.y, 0, H - paddleHeight);
    }

    // If client connected and not using AI, accept client's input for one side (we'll assume client is right player)
    if (isHost && isClient && dc && dc.readyState === 'open' && !aiToggle.checked) {
      const targetY = clamp(clientInput.y, 0, H - paddleHeight);
      right.y += (targetY - right.y) * 0.6; // smoothing
    }

    // Clamp paddles
    left.y = clamp(left.y, 0, H - paddleHeight);
    right.y = clamp(right.y, 0, H - paddleHeight);

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom collision
    if (ball.y - ballRadius <= 0) {
      ball.y = ballRadius;
      ball.vy *= -1;
      beep('wall');
    }
    if (ball.y + ballRadius >= H) {
      ball.y = H - ballRadius;
      ball.vy *= -1;
      beep('wall');
    }

    // Paddle collisions
    // Left paddle
    if (ball.x - ballRadius <= left.x + paddleWidth) {
      if (ball.y >= left.y && ball.y <= left.y + paddleHeight) {
        ball.x = left.x + paddleWidth + ballRadius;
        reflectFromPaddle(left);
        beep('hit');
      } else if (ball.x + ballRadius < 0) {
        scorePoint('right');
      }
    }

    // Right paddle
    if (ball.x + ballRadius >= right.x) {
      if (ball.y >= right.y && ball.y <= right.y + paddleHeight) {
        ball.x = right.x - ballRadius;
        reflectFromPaddle(right);
        beep('hit');
      } else if (ball.x - ballRadius > W) {
        scorePoint('left');
      }
    }
  }

  function reflectFromPaddle(paddle) {
    const relative = (ball.y - (paddle.y + paddleHeight / 2)) / (paddleHeight / 2);
    const clipped = Math.max(-1, Math.min(1, relative));
    const maxBounce = Math.PI / 3;
    const bounceAngle = clipped * maxBounce;
    const direction = (paddle === left) ? 1 : -1;
    ball.speed += speedIncrease;
    ball.vx = direction * ball.speed * Math.cos(bounceAngle);
    ball.vy = ball.speed * Math.sin(bounceAngle);
    ball.x += ball.vx * 0.5;
  }

  function scorePoint(side) {
    if (side === 'left') left.score += 1;
    else right.score += 1;
    beep('score');

    if (left.score >= winningScore || right.score >= winningScore) {
      running = false;
      statusEl.textContent = (left.score > right.score) ? 'Left Player wins!' : 'Right Player wins!';
      if (dc && dc.readyState === 'open') {
        try { dc.send(JSON.stringify({ type: 'gameover', winner: left.score > right.score ? 'left' : 'right' })); } catch(e){}
      }
      return;
    }

    const servingToLeft = (side === 'left') ? false : true;
    resetBall(servingToLeft);
    paused = true;
    btnPause.textContent = 'Resume';
    setTimeout(() => {
      paused = false;
      btnPause.textContent = 'Pause';
    }, 700);
  }

  function updateClientRender() {
    if (!lastReceivedState) return;
    left.y = lastReceivedState.left.y;
    left.score = lastReceivedState.left.score;
    right.y = lastReceivedState.right.y;
    right.score = lastReceivedState.right.score;
    ball.x = lastReceivedState.ball.x;
    ball.y = lastReceivedState.ball.y;
  }

  function loop(ts) {
    loopId = null;
    if (!running) return;
    if (!paused) {
      if (isHost) {
        updateHost(0);
        const now = performance.now();
        if (dc && dc.readyState === 'open' && now - lastStateSend > (1000 / stateSendHz)) {
          const payload = {
            type: 'state',
            left: { y: left.y, score: left.score },
            right: { y: right.y, score: right.score },
            ball: { x: ball.x, y: ball.y },
            ts: Date.now()
          };
          try {
            dc.send(JSON.stringify(payload));
          } catch (e) {
            console.warn('send failed', e);
          }
          lastStateSend = now;
        }
      } else if (isClient) {
        if (dc && dc.readyState === 'open') {
          try { dc.send(JSON.stringify({ type: 'input', y: clientInput.y })); } catch (e) {}
        }
        updateClientRender();
      } else {
        updateHost(0);
      }

      render();
    }
    requestFrame();
  }

  // Render
  function renderNet() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H));
    g.addColorStop(0, 'rgba(109,194,160,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    renderNet();

    ctx.fillStyle = '#bfead1';
    roundRect(ctx, left.x, left.y, paddleWidth, paddleHeight, 4, true);
    roundRect(ctx, right.x, right.y, paddleWidth, paddleHeight, 4, true);

    ctx.beginPath();
    ctx.fillStyle = '#6ee7b7';
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e6eef6';
    ctx.font = '40px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(left.score, W * 0.25, 60);
    ctx.fillText(right.score, W * 0.75, 60);

    ctx.font = '12px system-ui, Arial';
    ctx.fillStyle = 'rgba(230,238,246,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('First to ' + winningScore + ' wins', W / 2, H - 14);
  }

  // Helper: rounded rect
  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    else ctx.stroke();
  }

  // Inputs: keyboard
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
      e.preventDefault();
      pauseToggle();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Touch controls: dragging and buttons
  function setupTouchPads() {
    function updatePadVisibility() {
      const show = mobileToggle.checked || window.innerWidth < 900;
      touchLeft.style.display = show ? 'flex' : 'none';
      touchRight.style.display = show ? 'flex' : 'none';
    }
    mobileToggle.addEventListener('change', updatePadVisibility);
    updatePadVisibility();

    function touchToY(e, side) {
      const rect = canvas.getBoundingClientRect();
      let clientY = null;
      if (e.touches && e.touches.length) clientY = e.touches[0].clientY;
      else if (e.changedTouches && e.changedTouches.length) clientY = e.changedTouches[0].clientY;
      else clientY = e.clientY;
      const y = clientY - rect.top - paddleHeight / 2;
      if (side === 'left') {
        left.y = clamp(y, 0, H - paddleHeight);
      } else {
        const target = clamp(y, 0, H - paddleHeight);
        if (isClient) {
          clientInput.y = target;
        } else {
          right.y = target;
        }
      }
    }

    canvas.addEventListener('touchstart', (ev) => {
      ev.preventDefault();
      for (let t of ev.touches) {
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        const side = x < rect.width / 2 ? 'left' : 'right';
        const fake = { touches: [t] };
        touchToY(fake, side);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (ev) => {
      ev.preventDefault();
      for (let t of ev.touches) {
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        const side = x < rect.width / 2 ? 'left' : 'right';
        const fake = { touches: [t] };
        touchToY(fake, side);
      }
    }, { passive: false });

    function setupPadButtons(container, side) {
      const up = container.querySelector('.control-btn.up');
      const down = container.querySelector('.control-btn.down');
      let interval = null;

      function start(dir) {
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          if (side === 'left') {
            left.y += dir === 'up' ? -paddleSpeed : paddleSpeed;
            left.y = clamp(left.y, 0, H - paddleHeight);
          } else {
            if (isClient) {
              clientInput.y += dir === 'up' ? -paddleSpeed : paddleSpeed;
              clientInput.y = clamp(clientInput.y, 0, H - paddleHeight);
            } else {
              right.y += dir === 'up' ? -paddleSpeed : paddleSpeed;
              right.y = clamp(right.y, 0, H - paddleHeight);
            }
          }
        }, 50);
      }
      function stop() { if (interval) clearInterval(interval); interval = null; }

      up.addEventListener('touchstart', (e)=>{ e.preventDefault(); start('up'); });
      up.addEventListener('touchend', (e)=>{ e.preventDefault(); stop(); });
      down.addEventListener('touchstart', (e)=>{ e.preventDefault(); start('down'); });
      down.addEventListener('touchend', (e)=>{ e.preventDefault(); stop(); });

      up.addEventListener('mousedown', ()=>start('up'));
      up.addEventListener('mouseup', stop);
      down.addEventListener('mousedown', ()=>start('down'));
      down.addEventListener('mouseup', stop);
      container.addEventListener('mouseleave', stop);
    }
    setupPadButtons(touchLeft, 'left');
    setupPadButtons(touchRight, 'right');
  }

  setupTouchPads();

  // Multiplayer: simple WebRTC DataChannel manual SDP (no signaling server)
  function setMpStatus(s) { mpStatus.textContent = 'P2P: ' + s; }

  async function createPeerConnection() {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
    const connection = new RTCPeerConnection(config);

    connection.oniceconnectionstatechange = () => {
      setMpStatus('ICE ' + connection.iceConnectionState);
    };

    connection.onconnectionstatechange = () => {
      setMpStatus('Conn ' + connection.connectionState);
    };

    connection.onicecandidate = (ev) => {
      // we rely on final SDP copy/paste
    };

    return connection;
  }

  function setupHostDataChannel(channel) {
    dc = channel;
    dc.onopen = () => {
      setMpStatus('DataChannel open (host)');
      networkReady = true;
      isHost = true;
      isClient = false;
      statusEl.textContent = 'Hosting - client connected';
    };
    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'input') {
          clientInput.y = msg.y;
        }
      } catch (e) { console.warn('bad mp msg', e); }
    };
    dc.onclose = () => {
      setMpStatus('DataChannel closed');
      networkReady = false;
    };
  }

  function setupClientDataChannelHandlers(connection) {
    connection.ondatachannel = (ev) => {
      dc = ev.channel;
      dc.onopen = () => {
        setMpStatus('DataChannel open (client)');
        networkReady = true;
        isClient = true;
        isHost = false;
        statusEl.textContent = 'Joined - connected to host';
        try { dc.send(JSON.stringify({type:'ready'})); } catch (e) {}
      };
      dc.onmessage = (ev2) => {
        try {
          const msg = JSON.parse(ev2.data);
          if (msg.type === 'state') {
            lastReceivedState = msg;
          } else if (msg.type === 'gameover') {
            running = false;
            statusEl.textContent = msg.winner === 'left' ? 'Left Player wins!' : 'Right Player wins!';
          }
        } catch (e) {}
      };
      dc.onclose = () => {
        setMpStatus('DataChannel closed');
        networkReady = false;
      };
    };
  }

  btnHost.addEventListener('click', async () => {
    try {
      pc = await createPeerConnection();
      const channel = pc.createDataChannel('pong');
      setupHostDataChannel(channel);
      setupClientDataChannelHandlers(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setMpStatus('Creating offer...');
      await waitForIceGatheringComplete(pc, 1500);
      localSdp.value = pc.localDescription.sdp;
      setMpStatus('Offer created — share Local SDP with joiner and paste answer into Remote SDP');
      isHost = true;
      isClient = false;
    } catch (e) {
      console.error(e);
      setMpStatus('Host creation failed');
    }
  });

  btnSetRemoteAnswer.addEventListener('click', async () => {
    if (!pc) { setMpStatus('No peer connection (create host first)'); return; }
    const remote = remoteSdp.value.trim();
    if (!remote) { setMpStatus('Paste remote answer into Remote SDP'); return; }
    try {
      await pc.setRemoteDescription({ type: 'answer', sdp: remote });
      setMpStatus('Remote answer set — waiting for datachannel to open');
    } catch (e) {
      console.error(e);
      setMpStatus('Failed to set remote answer: ' + e.message);
    }
  });

  btnJoin.addEventListener('click', async () => {
    const offer = remoteSdp.value.trim();
    if (!offer) { setMpStatus('Paste host offer into Remote SDP then click Join'); return; }
    try {
      pc = await createPeerConnection();
      setupClientDataChannelHandlers(pc);
      await pc.setRemoteDescription({ type: 'offer', sdp: offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc, 1500);
      localSdp.value = pc.localDescription.sdp;
      setMpStatus('Answer created — copy Local SDP back to host');
      isClient = true;
      isHost = false;
    } catch (e) {
      console.error(e);
      setMpStatus('Join failed: ' + e.message);
    }
  });

  function waitForIceGatheringComplete(connection, timeout = 2000) {
    return new Promise((resolve) => {
      if (connection.iceGatheringState === 'complete') return resolve();
      const check = () => {
        if (connection.iceGatheringState === 'complete') {
          cleanup();
          resolve();
        }
      };
      const onstate = () => check();
      const to = setTimeout(() => { cleanup(); resolve(); }, timeout);
      function cleanup() {
        clearTimeout(to);
        connection.removeEventListener('icegatheringstatechange', onstate);
      }
      connection.addEventListener('icegatheringstatechange', onstate);
      check();
    });
  }

  // initial render
  render();

  // UI buttons
  btnNew.addEventListener('click', () => {
    if (isClient) {
      statusEl.textContent = 'Waiting for host state...';
      running = true;
      paused = false;
      if (!loopId) requestFrame();
    } else {
      newGame();
    }
  });
  btnPause.addEventListener('click', pauseToggle);

  // network cleanup on unload
  window.addEventListener('beforeunload', () => {
    try { if (dc) dc.close(); } catch(e){}
    try { if (pc) pc.close(); } catch(e){}
  });

  // Client input handlers (keyboard + touch)
  window.addEventListener('keydown', (e) => {
    if (isClient && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
      keys[e.code] = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (isClient && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
      keys[e.code] = false;
    }
  });

  setInterval(() => {
    if (!isClient) return;
    if (keys['ArrowUp']) clientInput.y -= paddleSpeed;
    if (keys['ArrowDown']) clientInput.y += paddleSpeed;
    clientInput.y = clamp(clientInput.y, 0, H - paddleHeight);
  }, 40);

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - paddleHeight / 2;
    if (x < rect.width / 2) left.y = clamp(y, 0, H - paddleHeight);
    else {
      if (isClient) clientInput.y = clamp(y, 0, H - paddleHeight);
      else right.y = clamp(y, 0, H - paddleHeight);
    }
  });

  function adaptTouchPadVisibility() {
    const show = mobileToggle.checked || window.innerWidth < 900;
    touchLeft.style.display = show ? 'flex' : 'none';
    touchRight.style.display = show ? 'flex' : 'none';
  }
  window.addEventListener('resize', adaptTouchPadVisibility);
  adaptTouchPadVisibility();

  function startLoopAlways() {
    if (!loopId) requestFrame();
  }
  startLoopAlways();

  // small helper to update status
  function info(msg) {
    statusEl.textContent = msg;
  }
})();