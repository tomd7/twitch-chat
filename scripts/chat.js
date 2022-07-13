(async () => {

    async function fetchBadges() {
        const badgesUrl = 'https://badges.twitch.tv/v1/badges/global/display';
        return await fetch(badgesUrl)
            .then(response => response.json())
            .then(badges => badges['badge_sets']);
    }

    function getEmoteUrl(emoteId) {
        return `https://static-cdn.jtvnw.net/emoticons/v1/${emoteId}/3.0`;
    }

    /**
     * @see {@link: https://www.stefanjudis.com/blog/how-to-display-twitch-emotes-in-tmi-js-chat-messages/}
     */
    function parseEmotes(message, tags) {

        const stringReplacements = [];

        const emotes = tags.emotes;
        for (const emoteId in emotes) {
            for (const position of emotes[emoteId]) {
                const [start, end] = position.split('-');
                const emoteName = message.substring(
                    parseInt(start, 10),
                    parseInt(end, 10) + 1
                );
                stringReplacements.push({
                    stringToReplace: emoteName,
                    replacement: `<img class="emote" src="${getEmoteUrl(emoteId)}" alt="${emoteName} emote">`,
                });
            }
        }

        return stringReplacements.reduce(
            (acc, { stringToReplace, replacement }) => {
                // obs browser doesn't seam to know about replaceAll
                return acc.split(stringToReplace).join(replacement);
            },
            message
        );
    }

    function findBadge(name, version) {
        version = badges[name]['versions'][version];

        if (!version) {
            return undefined;
        }

        let url;
        if (version['image_url_4x']) {
            url = version['image_url_4x'];
        } else if (version['image_url_2x']) {
            url = version['image_url_2x'];
        } else if (version['image_url_1x']) {
            url = version['image_url_1x'];
        }

        return url;
    }

    function addMessage(message, tags) {
        const username = tags['display-name'];
        let { color } = tags;
        let fgColor = '#fff';

        if (!color) {
            color = '#fff';
            fgColor = '#000';
        }

        const messageContainer = document.createElement('li');
        messageContainer.setAttribute('style', `--msg-color: ${color}; --fg-color: ${fgColor};`);

        const msgHeader = document.createElement('p');
        msgHeader.className = 'username';

        const messageP = document.createElement('p');
        messageP.className = 'message';
        messageP.innerHTML = parseEmotes(message, tags);

        const badgesList = document.createElement('div');
        badgesList.className = 'badges';

        for (const name in tags['badges']) {
            const version = tags['badges'][name];
            const badgeImg = findBadge(name, version);
            if (badgeImg) {
                const badgeEl = document.createElement('img');
                badgeEl.className = 'badge';
                badgeEl.src = badgeImg;
                badgesList.appendChild(badgeEl);
            }
        }
        msgHeader.appendChild(badgesList);

        const msgSpan = document.createElement('span');
        msgSpan.innerText = username;
        msgHeader.appendChild(msgSpan);

        messageContainer.appendChild(msgHeader);
        messageContainer.appendChild(messageP);

        chatEl.appendChild(messageContainer);
    }

    function handleChannelChange(e) {
        if (e instanceof KeyboardEvent && e.code !== "Enter") {
            return;
        }
        const newName = inputChannel.value.trim();
        if (client.channels.length > 0) {
            client.disconnect();
        }
        client.channels = [newName];
        client.connect();
    }

    const badges = await fetchBadges();
    let client = new tmi.Client({ channels: [] });
    const chatEl = document.getElementById('chat');
    const btnUpdate = document.getElementById('btn-update-channel');
    const inputChannel = document.getElementById('channel-name');

    client.on('message', (channel, tags, message, self) => {
        if (self) return true;
        addMessage(message, tags);
    });

    client.connect();

    btnUpdate.addEventListener('click', handleChannelChange);
    inputChannel.addEventListener('keydown', handleChannelChange)

})();
