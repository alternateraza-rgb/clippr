"""Where is the speaker, second by second.

Emits JSON: {"fps": 2.0, "width": W, "height": H, "track": [{"t": 0.0, "x": 0.51}, ...]}
where `x` is the horizontal centre of the face as a fraction of frame width.

Deliberately dumb and fast: a 9:16 crop only needs one number per moment, and a
Haar cascade at 2fps costs a few seconds for a minute of video. Frames with no
detection are left out entirely rather than guessed at — the caller decides
what to do with gaps, and inventing a centre is worse than admitting we do not
know.
"""

import argparse
import json
import sys

import cv2


def largest_face(gray, cascades):
    """The biggest face in frame. On an interview that is the person closest to
    camera, which is nearly always whoever is being framed."""
    best = None
    for cascade in cascades:
        found = cascade.detectMultiScale(
            gray, scaleFactor=1.15, minNeighbors=6, minSize=(48, 48)
        )
        for (x, y, w, h) in found:
            if best is None or w * h > best[2] * best[3]:
                best = (int(x), int(y), int(w), int(h))
    return best


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("video")
    parser.add_argument("--fps", type=float, default=2.0)
    args = parser.parse_args()

    capture = cv2.VideoCapture(args.video)
    if not capture.isOpened():
        print(json.dumps({"error": "could not open video"}), file=sys.stdout)
        return 1

    src_fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    step = max(1, int(round(src_fps / max(args.fps, 0.1))))

    base = cv2.data.haarcascades
    cascades = [
        cv2.CascadeClassifier(base + "haarcascade_frontalface_default.xml"),
        cv2.CascadeClassifier(base + "haarcascade_profileface.xml"),
    ]
    cascades = [c for c in cascades if not c.empty()]
    if not cascades:
        print(json.dumps({"error": "no cascades available"}))
        return 1

    track = []
    index = 0
    while True:
        ok = capture.grab()
        if not ok:
            break
        if index % step == 0:
            ok, frame = capture.retrieve()
            if ok and frame is not None:
                # Detection runs on a downscaled copy: face position is all we
                # need and 480px wide is plenty for that.
                scale = 480.0 / max(frame.shape[1], 1)
                small = cv2.resize(frame, None, fx=scale, fy=scale) if scale < 1 else frame
                gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
                face = largest_face(gray, cascades)
                if face:
                    x, _, w, _ = face
                    track.append(
                        {
                            "t": round(index / src_fps, 3),
                            "x": round((x + w / 2) / max(small.shape[1], 1), 4),
                            "w": round(w / max(small.shape[1], 1), 4),
                        }
                    )
        index += 1
    capture.release()

    print(json.dumps({"fps": args.fps, "width": width, "height": height, "track": track}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
