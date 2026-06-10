from __future__ import annotations

import argparse
import json

from .pipeline import Config, TrendMemeFactory


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="trend-meme-factory",
        description="Research safe trends, create original meme concepts, render images, and save a full audit trail.",
    )
    parser.add_argument("--output-root", default="./outputs", help="Root output directory.")
    parser.add_argument("--run-date", default=None, help="Override run date as YYYY-MM-DD.")
    parser.add_argument("--max-topics-to-research", type=int, default=20)
    parser.add_argument("--max-topics-to-approve", type=int, default=8)
    parser.add_argument("--memes-per-topic", type=int, default=2)
    parser.add_argument("--max-final-memes", type=int, default=10)
    parser.add_argument("--image-format", default="png")
    parser.add_argument("--default-aspect-ratio", default="square")
    parser.add_argument("--disable-web-research", action="store_true")
    parser.add_argument("--disable-image-generation", action="store_true")
    parser.add_argument("--disable-text-overlay", action="store_true")
    parser.add_argument("--relaxed-safety-mode", action="store_true")
    parser.add_argument("--json", action="store_true", help="Print final summary as JSON.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    config = Config(
        max_topics_to_research=args.max_topics_to_research,
        max_topics_to_approve=args.max_topics_to_approve,
        memes_per_topic=args.memes_per_topic,
        max_final_memes=args.max_final_memes,
        output_root=args.output_root,
        image_format=args.image_format,
        default_aspect_ratio=args.default_aspect_ratio,
        run_date=args.run_date,
        enable_web_research=not args.disable_web_research,
        enable_image_generation=not args.disable_image_generation,
        enable_text_overlay=not args.disable_text_overlay,
        strict_safety_mode=not args.relaxed_safety_mode,
    )

    result = TrendMemeFactory(config).run()

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0

    counts = result["counts"]
    warnings = result.get("warnings") or []
    print(f"Researched topics: {counts['topics_researched']}")
    print(f"Approved topics: {counts['topics_approved']}")
    print(f"Rejected topics: {counts['topics_rejected']}")
    print(f"Meme concepts: {counts['meme_concepts']}")
    print(f"Images generated: {counts['images_generated']}")
    print(f"Final memes approved: {counts['final_memes_approved']}")
    print(f"Output folder: {result['output_folder']}")
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"- {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())