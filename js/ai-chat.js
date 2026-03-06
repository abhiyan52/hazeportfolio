(function ($) {
    "use strict";

    let engine;
    let chatHistory = [];
    let isBooted = false;
    let useFallback = false;
    let bioData = "";

    // Load bio data
    fetch('data/bio.md')
        .then(response => response.text())
        .then(text => {
            bioData = text;
        });

    const MODEL_ID = "SmolLM-135M-Instruct-v0.2-q4f16_1-MLC";

    async function loadWebLLMRuntime() {
        if (window.webllm) return true;
        try {
            const module = await import("https://esm.run/@mlc-ai/web-llm");
            window.webllm = module;
            return true;
        } catch (error) {
            console.error("WebLLM load error:", error);
            handleFallback("Unable to download the local AI runtime.");
            return false;
        }
    }

    async function initEngine() {
        if (isBooted) return;

        const chatStatus = document.getElementById('chat-status');
        const bootBtn = document.getElementById('boot-ai');
        const bootProgress = document.getElementById('boot-progress');
        const progressBarFill = document.querySelector('.progress-bar-fill');
        const progressText = document.querySelector('.progress-text');

        bootBtn.disabled = true;
        bootBtn.innerText = "Initializing...";
        bootProgress.style.display = 'block';

        // CHECK FOR WEBGPU SUPPORT
        if (!navigator.gpu) {
            handleFallback("WebGPU not supported in this browser.");
            return;
        }

        if (!await loadWebLLMRuntime()) {
            return;
        }

        try {
            engine = new window.webllm.MLCEngine();
            engine.setInitProgressCallback((report) => {
                const progress = Math.round(report.progress * 100);
                progressBarFill.style.width = progress + '%';
                progressText.innerText = report.text;
                chatStatus.innerText = "Loading model...";
            });

            await engine.reload(MODEL_ID);

            isBooted = true;
            chatStatus.innerText = "Online - Local GPU";
            document.getElementById('boot-container').style.display = 'none';
            document.getElementById('chat-input-container').style.display = 'flex';

            appendBotMessage("<strong>Local intelligence activated!</strong> I'm now running entirely on your GPU. How can I help you?");
        } catch (e) {
            console.error("WebGPU Init Error:", e);
            handleFallback("Failed to initialize WebGPU engine.");
        }
    }

    function handleFallback(reason) {
        console.warn("AI Fallback triggered:", reason);
        const chatStatus = document.getElementById('chat-status');
        chatStatus.innerText = "Online - Cloud Intelligence";
        useFallback = true;
        isBooted = true;
        document.getElementById('boot-container').style.display = 'none';
        const bootProgress = document.getElementById('boot-progress');
        if (bootProgress) {
            bootProgress.style.display = 'none';
        }
        document.getElementById('chat-input-container').style.display = 'flex';

        appendBotMessage("<em>Note: WebGPU is unavailable. I've switched to my cloud-based brain so we can still chat!</em>");
    }

    function appendBotMessage(text) {
        const msgDiv = $('<div class="message bot"></div>').html(text);
        $('#ai-chat-messages').append(msgDiv);
        scrollToBottom();
    }

    function appendUserMessage(text) {
        const msgDiv = $('<div class="message user"></div>').text(text);
        $('#ai-chat-messages').append(msgDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        const container = document.getElementById('ai-chat-messages');
        container.scrollTop = container.scrollHeight;
    }

    // Base64 obfuscated key to deter simple scrapers
    const _gk = atob("QUl6YVN5Q3A5bkdOY0hxeDFLZ0JKVFV0WlA1YzNyQVROM05FMklr");

    async function handleChat() {
        const input = $('#ai-chat-input').val().trim();
        if (!input || !isBooted) return;

        appendUserMessage(input);
        $('#ai-chat-input').val('');

        const thinkingMsg = $('<div class="message bot thinking"><img src="images/chatbot/smile.jpg" class="loading-bot-img"><span>Thinking...</span></div>');
        $('#ai-chat-messages').append(thinkingMsg);
        scrollToBottom();

        chatHistory.push({ role: "user", content: input });

        const systemPrompt = "You are Abhiyan Timilsina's AI Digital Twin. Use the following context to answer questions accurately and professionally. Be concise.\n\nContext:\n" + bioData +
            "\n\nSpecial Instruction: If the user wants to send an email, hire you, or contact you, mention you can trigger the contact form. If they say 'send email' or similar, I will tell them I've opened the form for them.";

        try {
            let botResponse = "";

            if (useFallback) {
                // GOOGLE GEMINI API FALLBACK (Updated to 2.5 Flash-Lite)
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${_gk}`;
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: systemPrompt + "\n\nUser Question: " + input }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 800,
                        }
                    })
                });

                const data = await response.json();
                if (data.error) {
                    console.error("Gemini API Error:", data.error.message);
                    botResponse = "My cloud brain is reporting an issue: " + data.error.message;
                } else if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                    botResponse = data.candidates[0].content.parts[0].text;
                } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                    botResponse = "I'm sorry, but I can't answer that due to safety filters: " + data.promptFeedback.blockReason;
                } else {
                    botResponse = "I'm having trouble connecting to my cloud brain right now. Please check if the API key is valid.";
                }
            } else {
                // LOCAL WEBGPU INFERENCE
                const messages = [
                    { role: "system", content: systemPrompt },
                    ...chatHistory
                ];
                const reply = await engine.chat.completions.create({
                    messages,
                    temperature: 0.7,
                });
                botResponse = reply.choices[0].message.content;
            }

            thinkingMsg.remove();
            appendBotMessage(botResponse);
            chatHistory.push({ role: "assistant", content: botResponse });

            // TOOL DETECTION: Auto-scroll to contact form
            const triggerWords = ["contact form", "opened the form", "get in touch", "send an email"];
            if (triggerWords.some(word => botResponse.toLowerCase().includes(word))) {
                setTimeout(() => {
                    // Close chat window and show button before scrolling
                    $('#ai-chat-window').removeClass('active');
                    $('#ai-chat-button .pulse-ring').show();

                    $('html, body').animate({
                        scrollTop: $("#contact").offset().top + 'px'
                    }, 1000);
                    $("#contact input[name='email']").focus();
                }, 2000);
            }

        } catch (e) {
            console.error("Chat Error:", e);
            thinkingMsg.remove();
            appendBotMessage("Oops, I hit a snag while processing that. Please try again.");
        }
    }

    $(function () {
        $('#ai-chat-button').click(function () {
            $('#ai-chat-window').toggleClass('active');
            $(this).find('.pulse-ring').toggle(!$('#ai-chat-window').hasClass('active'));
        });

        $('#close-chat').click(function () {
            $('#ai-chat-window').removeClass('active');
            $('#ai-chat-button .pulse-ring').show();
        });

        $('#boot-ai').click(initEngine);

        $('#send-ai-chat').click(handleChat);

        $('#ai-chat-input').keypress(function (e) {
            if (e.which == 13) handleChat();
        });
    });

})(jQuery);
