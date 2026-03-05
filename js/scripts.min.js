(function($) {
    "use strict";

    $(function() {
        $("#current-year").text(new Date().getFullYear());
        $('html').removeClass('no-js');

        $('header a').click(function(e) {
            if ($(this).hasClass('no-scroll')) return;
            e.preventDefault();

            var heading = $(this).attr('href');
            var scrollDistance = $(heading).offset().top;

            $('html, body').animate({
                scrollTop: scrollDistance + 'px'
            }, 500);

            if ($('header').hasClass('active')) {
                $('header, body').removeClass('active');
            }
        });

        $('#to-top').click(function() {
            $('html, body').animate({ scrollTop: 0 }, 500);
        });

        $('#lead-down span').click(function() {
            var scrollDistance = $('#lead').next().offset().top;
            $('html, body').animate({ scrollTop: scrollDistance + 'px' }, 500);
        });

        $('#experience-timeline').each(function() {
            var $this = $(this);
            var $userContent = $this.children('div');

            $userContent.each(function() {
                $(this)
                    .addClass('vtimeline-content')
                    .wrap('<div class="vtimeline-point"><div class="vtimeline-block"></div></div>');
            });

            $this.find('.vtimeline-point').each(function() {
                $(this).prepend('<div class="vtimeline-icon"><i class="fa fa-rocket"></i></div>');
            });

            $this.find('.vtimeline-content').each(function() {
                var date = $(this).data('date');
                if (date) {
                    $(this).parent().prepend('<span class="vtimeline-date">' + date + '</span>');
                }
            });
        });

        $('#mobile-menu-open').click(function() {
            $('header, body').addClass('active');
        });

        $('#mobile-menu-close').click(function() {
            $('header, body').removeClass('active');
        });

        var revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        $('.reveal').each(function() {
            revealObserver.observe(this);
        });

        var dummyReplies = [
            "I'm currently targeting AI engineering roles where I can ship production LLM features end-to-end.",
            "My strongest edge is combining backend scalability with practical AI product thinking.",
            "I love building chat, retrieval, and workflow automation systems that create measurable business value.",
            "I can quickly prototype with public endpoints and later harden systems for enterprise deployment."
        ];

        function appendMessage(role, text) {
            var message = $('<div class="message"></div>').addClass(role).text(text);
            $('#chat-window').append(message);
            $('#chat-window').scrollTop($('#chat-window')[0].scrollHeight);
        }

        $('#send-dummy').click(function() {
            var input = $('#chat-input').val().trim();
            if (!input) return;

            appendMessage('user', input);
            $('#chat-input').val('');

            var response = dummyReplies[Math.floor(Math.random() * dummyReplies.length)];
            setTimeout(function() {
                appendMessage('bot', response);
            }, 450);
        });

        $('#send-llm').click(async function() {
            var input = $('#chat-input').val().trim();
            if (!input) return;

            var selectedModel = $('#model-select').val();
            appendMessage('user', input);
            $('#chat-input').val('');
            appendMessage('bot', 'Thinking...');

            try {
                var response = await fetch('https://mlvoca.com/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: selectedModel,
                        prompt: "You are Abhiyan's digital twin. Keep answers concise and professional. User asks: " + input,
                        stream: false
                    })
                });

                var data = await response.json();
                $('#chat-window .message.bot').last().text(data.response || 'No response received from endpoint.');
            } catch (error) {
                $('#chat-window .message.bot').last().text('Public endpoint unavailable right now. This demo still shows the chat UI and dummy flow.');
            }
        });
    });
})(jQuery);
