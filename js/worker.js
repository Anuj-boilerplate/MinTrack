let timerId = null;

self.onmessage = function(e) {
    if (e.data === 'start') {
        if (!timerId) {
            timerId = setInterval(() => {
                postMessage('tick');
            }, 1000);
        }
    } else if (e.data === 'stop') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }
};
