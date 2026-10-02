#!/usr/bin/env python3
"""掃描 projects/ 底下的資料夾，產生 projects.json（網頁靠它顯示作品）。

資料夾命名：  [排序數字-]標題__類別
  例：01-台北馬拉松__運動賽事
      02-品牌形象片__影片製作
- 排序數字（可省略）決定順序；標題與類別用兩個底線 __ 分開
- 主打區：數字最小的動態作品 = 右側大橫幅，數字最小的平面作品 = 左側直式；其餘作品等大排在下方
- 資料夾內有影片 (mp4/m4v/webm/mov) → 動態作品，取排序第一支影片，封面是影片第一個畫面
  - 可放 youtube.txt（第一行貼 YouTube 連結）
- 沒有影片、只有圖片 → 平面作品，資料夾內所有照片自動歸進這張卡片，第一張當封面
- 資料夾名稱開頭是 _ 或 . 的會被略過（可當草稿匣）
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECTS = ROOT / "projects"
IMG = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}
VID = {".mp4", ".m4v", ".webm", ".mov"}
NAME = re.compile(r"^(?:(\d+)[\s._-]+)?(.*?)\s*__\s*(.*)$")


def natural(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def read_youtube(folder):
    for fname in ("youtube.txt", "youtube.url"):
        f = folder / fname
        if not f.is_file():
            continue
        for line in f.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            line = line.strip()
            if line.upper().startswith("URL="):
                line = line[4:].strip()
            if line.lower().startswith(("http://", "https://")):
                return line
    return ""


def main():
    items = []
    if not PROJECTS.is_dir():
        print("找不到 projects/ 資料夾", file=sys.stderr)
    else:
        folders = sorted(
            (d for d in PROJECTS.iterdir() if d.is_dir() and not d.name.startswith((".", "_"))),
            key=lambda d: natural(d.name),
        )
        for d in folders:
            m = NAME.match(d.name)
            title, category = (m.group(2).strip(), m.group(3).strip()) if m else (re.sub(r"^\d+[\s._-]+", "", d.name), "")
            files = sorted((f for f in d.iterdir() if f.is_file() and not f.name.startswith(".")), key=lambda f: natural(f.name))
            vids = [f for f in files if f.suffix.lower() in VID]
            imgs = [f for f in files if f.suffix.lower() in IMG]
            rel = lambda f: f.relative_to(ROOT).as_posix()
            if vids:
                if imgs:
                    print(f"提示：{d.name} 同時有影片和圖片，只會當作動態作品（圖片不使用）")
                items.append({"title": title, "category": category, "type": "video", "video": rel(vids[0]), "youtube": read_youtube(d)})
                if len(vids) > 1:
                    print(f"提示：{d.name} 有多支影片，只使用第一支：{vids[0].name}")
            elif imgs:
                items.append({"title": title, "category": category, "type": "photo", "images": [rel(f) for f in imgs]})
            else:
                print(f"略過：{d.name}（沒有圖片或影片）")

    (ROOT / "projects.json").write_text(json.dumps({"projects": items}, ensure_ascii=False, indent=2), encoding="utf-8")
    v = sum(1 for i in items if i["type"] == "video")
    print(f"完成：{len(items)} 個作品（動態 {v}、平面 {len(items) - v}）→ projects.json")


if __name__ == "__main__":
    main()
