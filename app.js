const audioPlayers = Array.from(document.querySelectorAll('audio'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const previousAnimation = new WeakMap();
const runningAnimations = new WeakMap();

const interactionAnimations = [
    [
        { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(185, 95, 76, 0)' },
        { transform: 'scale(1.12)', boxShadow: '0 0 0 8px rgba(185, 95, 76, .12)', offset: .55 },
        { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(185, 95, 76, 0)' }
    ],
    [
        { transform: 'translateY(0) rotate(0)' },
        { transform: 'translateY(-4px) rotate(-5deg)', offset: .45 },
        { transform: 'translateY(0) rotate(0)' }
    ],
    [
        { transform: 'scale(1)' },
        { transform: 'scale(.92)', offset: .3 },
        { transform: 'scale(1.08)', offset: .68 },
        { transform: 'scale(1)' }
    ],
    [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-3px)', offset: .35 },
        { transform: 'translateY(0)', offset: .7 },
        { transform: 'translateY(-1px)' },
        { transform: 'translateY(0)' }
    ]
];

const commentAnimations = [
    [{ opacity: 0, transform: 'translateX(-10px) scale(.98)' }, { opacity: 1, transform: 'translateX(0) scale(1)' }],
    [{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }],
    [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'scale(1)' }]
];

function chooseAnimation(target, animations) {
    let index = Math.floor(Math.random() * animations.length);
    if (animations.length > 1 && index === previousAnimation.get(target)) {
        index = (index + 1 + Math.floor(Math.random() * (animations.length - 1))) % animations.length;
    }
    previousAnimation.set(target, index);
    return animations[index];
}

function animateInteraction(target, animations, duration = 420) {
    if (reducedMotion.matches || typeof target.animate !== 'function') {
        return;
    }

    const running = runningAnimations.get(target);
    if (running) {
        running.cancel();
    }
    const animation = target.animate(chooseAnimation(target, animations), {
        duration,
        easing: 'cubic-bezier(.2, .75, .25, 1)'
    });
    runningAnimations.set(target, animation);
    animation.onfinish = () => {
        if (runningAnimations.get(target) === animation) {
            runningAnimations.delete(target);
        }
    };
}

function updateTrackPlayback(audio) {
    const track = audio.closest('.music-card, .song-section');

    if (track) {
        track.classList.toggle('playing', !audio.paused && !audio.ended);
        animateInteraction(track, interactionAnimations, 500);
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

function renderComments(list, comments, animateLatest = false) {
    list.replaceChildren();

    comments.forEach((comment, index) => {
        const item = document.createElement('li');
        item.textContent = comment;
        list.append(item);
        if (animateLatest && index === comments.length - 1) {
            animateInteraction(item, commentAnimations, 360);
        }
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
        animateInteraction(likeButton, interactionAnimations);
        saveCommunityData();
    });

    commentList.addEventListener('click', event => {
        const comment = event.target.closest('li');
        if (comment) {
            animateInteraction(comment, commentAnimations, 300);
        }
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
        renderComments(commentList, trackData.comments, true);
        saveCommunityData();
        commentForm.reset();
        commentInput.focus();
    });

    updateLikeButton();
    renderComments(commentList, trackData.comments);
});
