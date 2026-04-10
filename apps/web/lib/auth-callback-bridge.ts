const callbackBridgeScript = String.raw`
(function () {
  var status = document.getElementById("auth-callback-status");
  var params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  var accessToken = params.get("access_token");
  var refreshToken = params.get("refresh_token");
  var error = params.get("error_description") || params.get("error");

  function show(message) {
    if (status) {
      status.textContent = message;
    }
  }

  if (error) {
    show("We could not complete sign-in: " + error);
    return;
  }

  if (!accessToken || !refreshToken) {
    show("This sign-in link is missing the session details. Request a fresh magic link and open it in the same browser.");
    return;
  }

  show("Securing your session...");

  fetch("/auth/session", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      accessToken: accessToken,
      refreshToken: refreshToken
    })
  }).then(function (response) {
    if (!response.ok) {
      throw new Error("Session could not be saved.");
    }
    window.location.replace("/app?notice=Welcome%20back.");
  }).catch(function () {
    show("We could not save your session. Request a fresh magic link and try again.");
  });
})();
`;

export function buildAuthCallbackBridgeHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Completing sign-in | OutFlow</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
        color: #101318;
        background: #eef1f5;
      }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
      }
      main {
        width: min(480px, calc(100vw - 32px));
        border: 1px solid rgba(17, 24, 39, 0.1);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 22px 60px rgba(30, 41, 59, 0.11);
        padding: 32px;
      }
      p {
        color: #606a78;
        line-height: 1.6;
      }
      a {
        color: #375cff;
      }
    </style>
  </head>
  <body>
    <main>
      <p>OutFlow secure sign-in</p>
      <h1>Completing sign-in</h1>
      <p id="auth-callback-status">Checking the email link...</p>
      <p><a href="/sign-in">Request a new magic link</a></p>
    </main>
    <script>${callbackBridgeScript}</script>
  </body>
</html>`;
}
