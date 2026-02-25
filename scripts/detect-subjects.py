#!/usr/bin/env python3
"""
Subject Detection for 9:16 Reframe — ClipWise / APRT Media

Analyzes a video to find the average horizontal position of faces/subjects.
Returns a JSON object with:
  - x_center: normalized 0.0–1.0 (0.5 = dead center)
  - confidence: how many frames had detected faces (0.0–1.0)
  - face_count: average faces per detection frame

Uses OpenCV's Haar cascade for lightweight, local face detection.
No GPU required — runs on CPU in ~2-5 seconds for a typical 2min clip.

Usage: python3 detect-subjects.py <video_path> [--sample-rate 2]
Output: JSON to stdout
"""

import sys
import json
import cv2
import os
import argparse


def detect_subject_position(video_path, sample_fps=2):
    """
    Sample frames from video at `sample_fps` and detect face positions.
    Returns average normalized X center of detected faces.
    """
    if not os.path.exists(video_path):
        return {"error": f"File not found: {video_path}"}

    # Load face cascade
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": f"Cannot open video: {video_path}"}

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if width == 0 or height == 0:
        cap.release()
        return {"error": "Invalid video dimensions"}

    # How many video frames to skip between samples
    frame_interval = max(1, int(video_fps / sample_fps))

    x_positions = []  # normalized x-center of each detected face
    frames_sampled = 0
    frames_with_faces = 0

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            frames_sampled += 1

            # Convert to grayscale for detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Detect faces — scale factor 1.1, min neighbors 5 for reliability
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
            )

            if len(faces) > 0:
                frames_with_faces += 1

                # Use the largest face (most likely the main subject)
                largest_face = max(faces, key=lambda f: f[2] * f[3])
                fx, fy, fw, fh = largest_face
                face_center_x = (fx + fw / 2) / width
                x_positions.append(face_center_x)

        frame_idx += 1

    cap.release()

    if frames_sampled == 0:
        return {"x_center": 0.5, "confidence": 0.0, "face_count": 0}

    confidence = frames_with_faces / frames_sampled if frames_sampled > 0 else 0

    if len(x_positions) == 0:
        # No faces detected — center crop fallback
        return {"x_center": 0.5, "confidence": 0.0, "face_count": 0}

    # Weighted average: more recent detections slightly weighted
    # (for documentary, subject usually stays put, so simple average is fine)
    avg_x = sum(x_positions) / len(x_positions)

    # Clamp to safe range (don't crop too far to edges)
    # The crop window needs room on both sides, so keep x_center between 0.15–0.85
    avg_x = max(0.15, min(0.85, avg_x))

    return {
        "x_center": round(avg_x, 4),
        "confidence": round(confidence, 3),
        "face_count": len(x_positions),
        "frames_sampled": frames_sampled,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Detect subject position in video")
    parser.add_argument("video_path", help="Path to video file")
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=2,
        help="Frames per second to sample (default: 2)",
    )
    args = parser.parse_args()

    result = detect_subject_position(args.video_path, args.sample_rate)
    print(json.dumps(result))
