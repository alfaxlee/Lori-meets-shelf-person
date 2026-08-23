# === 影片影格擷取腳本 (extract_frames.py) ===
# 用於將 mp4 影片檔案自動分解為流暢的逐格圖片 (PNG)，供「我看了魔」技能逐格播放
# 新增程式碼皆附上中文註解

import os
import sys

def extract_video_frames(video_path, output_dir, target_fps=10, max_duration=6.0):
    """
    從影片檔案中擷取影格並輸出為 PNG 圖片
    :param video_path: 輸入的 mp4 影片檔案路徑
    :param output_dir: 輸出的圖片資料夾
    :param target_fps: 目標擷取幀率 (預設 10 fps)
    :param max_duration: 最大播放時長 (預設 6 秒)
    """
    try:
        import cv2
    except ImportError:
        print("正在嘗試使用 cv2，請確保已安裝 opencv-python")
        return False

    if not os.path.exists(video_path):
        print(f"錯誤：找不到影片檔案 {video_path}")
        return False

    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"錯誤：無法開啟影片檔案 {video_path}")
        return False

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if video_fps <= 0:
        video_fps = 30.0

    step = max(1, int(round(video_fps / target_fps)))
    total_frames_to_read = int(video_fps * max_duration)

    frame_count = 0
    saved_count = 0

    print(f"開始從 {video_path} 擷取影格 (影片原始 FPS: {video_fps:.1f}, 採樣間隔: 每 {step} 幀擷取 1 張)...")

    while cap.isOpened() and frame_count < total_frames_to_read:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % step == 0:
            out_filename = os.path.join(output_dir, f"frame_{saved_count}.png")
            # 調整大小以維持良好性能 (寬度等比例縮放至最寬 500px)
            h, w = frame.shape[:2]
            if w > 500:
                scale = 500.0 / w
                frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            
            cv2.imwrite(out_filename, frame)
            saved_count += 1

        frame_count += 1

    cap.release()
    print(f"擷取完成！共生成 {saved_count} 張影格圖片，儲存於：{output_dir}")
    return True

if __name__ == "__main__":
    default_video = os.path.join("assets", "demon.mp4")
    default_output = os.path.join("assets", "images", "demon_frames")

    target_video = sys.argv[1] if len(sys.argv) > 1 else default_video
    target_out = sys.argv[2] if len(sys.argv) > 2 else default_output

    extract_video_frames(target_video, target_out)
