
    let widgetLoaded = false;

    function openChat() {
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('chatScreen').classList.add('active');
        document.getElementById('statusText').textContent = 'Connecting…';
        loadWidget();
    }

    function loadWidget() {
        if (widgetLoaded) return;
        widgetLoaded = true;

        const script = document.createElement('script');
        script.src = 'https://widget.supportai.com/9207bc54d500f36.js';
        script.async = true;
        script.onload = () => waitForWidget(0);
        script.onerror = () => {
            document.getElementById('chatLoading').innerHTML =
                '<p style="color:#ef4444;">❌ Could not load assistant. Please refresh.</p>';
        };
        document.head.appendChild(script);
    }

    function waitForWidget(attempts) {
        const botUI   = document.getElementById('supportai-bot-ui');
        const trigger = document.getElementById('supportai-chat-icon');

        if (botUI) {
            // Move widget into our chat area
            document.getElementById('chatScreen').appendChild(botUI);
            botUI.style.cssText = 'position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:0!important;box-shadow:none!important;';

            // Open the chat panel inside the widget
            if (trigger) trigger.click();

            document.getElementById('chatLoading').style.display = 'none';
            document.getElementById('statusText').textContent = 'Ready to chat 💙';

        } else if (attempts < 50) {
            setTimeout(() => waitForWidget(attempts + 1), 100);
        } else {
            // Last resort: just click trigger wherever it ended up
            const t = document.getElementById('supportai-chat-icon');
            if (t) t.click();
            document.getElementById('chatLoading').style.display = 'none';
            document.getElementById('statusText').textContent = 'Ready to chat 💙';
        }
    }
