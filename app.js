const audioPlayers = Array.from(document.querySelectorAll('audio'));

function updateTrackPlayback(audio) {
    const track = audio.closest('.music-card, .song-section');

    if (track) {
        track.classList.toggle('playing', !audio.paused && !audio.ended);
    }
}

audioPlayers.forEach(audio => {
    audio.addEventListener('play', () => {
        audioPlayers.forEach(otherAudio => {
            if (otherAudio !== audio) {
                otherAudio.pause();
            }
        });
        updateTrackPlayback(audio);
    });

    audio.addEventListener('pause', () => updateTrackPlayback(audio));
    audio.addEventListener('ended', () => updateTrackPlayback(audio));
});

const STORAGE_KEY = 'clegacy-community-v1';

function readCommunityData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
        return {};
    }
}

const communityData = readCommunityData();

function saveCommunityData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(communityData));
    } catch {}
}

function getTrackData(trackId) {
    const saved = communityData[trackId];
    return {
        liked: Boolean(saved && saved.liked),
        comments: saved && Array.isArray(saved.comments)
            ? saved.comments.filter(comment => typeof comment === 'string').slice(-50)
            : []
    };
}

function renderComments(list, comments) {
    list.replaceChildren();

    comments.forEach(comment => {
        const item = document.createElement('li');
        item.textContent = comment;
        list.append(item);
    });
}

document.querySelectorAll('.track-activity').forEach(activity => {
    const trackId = activity.dataset.trackId;
    const likeButton = activity.querySelector('.like-button');
    const likeLabel = activity.querySelector('.like-label');
    const likeCount = activity.querySelector('.like-count');
    const commentForm = activity.querySelector('.comment-form');
    const commentInput = commentForm.elements.comment;
    const commentList = activity.querySelector('.comment-list');
    const trackData = getTrackData(trackId);

    function updateLikeButton() {
        likeButton.setAttribute('aria-pressed', String(trackData.liked));
        likeLabel.textContent = trackData.liked ? 'Liked' : 'Like';
        likeCount.textContent = trackData.liked ? '1' : '0';
    }

    likeButton.addEventListener('click', () => {
        trackData.liked = !trackData.liked;
        communityData[trackId] = trackData;
        updateLikeButton();
        saveCommunityData();
    });

    commentForm.addEventListener('submit', event => {
        event.preventDefault();
        const comment = commentInput.value.trim();

        if (!comment) {
            return;
        }

        trackData.comments.push(comment.slice(0, 280));
        trackData.comments = trackData.comments.slice(-50);
        communityData[trackId] = trackData;
        renderComments(commentList, trackData.comments);
        saveCommunityData();
        commentForm.reset();
        commentInput.focus();
    });

    updateLikeButton();
    renderComments(commentList, trackData.comments);
});
