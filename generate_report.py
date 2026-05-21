# -*- coding: utf-8 -*-
"""
Orchestrator: chạy từng step để sinh báo cáo .docx hoàn chỉnh.
"""
import os
import sys

# Thêm thư mục gốc vào path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from report_steps.helpers import create_document
from report_steps import (
    step01_cover,
    step02_front_matter,
    step03_chapter1,
    step04_chapter2,
    step05_chapter3,
    step06_chapter4,
    step07_chapter5,
    step08_chapter6_refs,
)

STEPS = [
    ("Trang bìa",                        step01_cover),
    ("Thành viên, Mục lục, Danh sách",   step02_front_matter),
    ("Chương 1 – Tổng quan đề tài",      step03_chapter1),
    ("Chương 2 – Phân tích yêu cầu",     step04_chapter2),
    ("Chương 3 – Thiết kế hệ thống",     step05_chapter3),
    ("Chương 4 – Công nghệ",             step06_chapter4),
    ("Chương 5 – Cài đặt & Kết quả",     step07_chapter5),
    ("Chương 6 – Kết luận & Tham khảo",   step08_chapter6_refs),
]


def main():
    doc = create_document()
    total = len(STEPS)

    for idx, (label, module) in enumerate(STEPS, 1):
        print(f"[{idx}/{total}] Đang sinh: {label} ...")
        module.build(doc)

    output = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "Bao_cao_SmartFridgeAI_NguyenDinhPhuc.docx",
    )
    doc.save(output)
    print(f"\nHoàn tất! File: {output}")


if __name__ == "__main__":
    main()
