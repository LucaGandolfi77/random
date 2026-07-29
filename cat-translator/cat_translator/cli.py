import argparse
import sys

from . import dataset, train


def main():
    parser = argparse.ArgumentParser(
        description="🐱 Cat Translator — Traduttore di versi di gatti"
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("download", help="Scarica il dataset CatMeows da Zenodo")

    train_parser = sub.add_parser("train", help="Addestra il modello")
    train_parser.add_argument(
        "--output", default=None, help="Directory di output per il modello"
    )

    trans_parser = sub.add_parser(
        "translate", help="Traduci un file audio .wav"
    )
    trans_parser.add_argument("file", help="Percorso del file .wav")

    serve_parser = sub.add_parser("serve", help="Avvia l'interfaccia web")
    serve_parser.add_argument(
        "--host", default="0.0.0.0", help="Host (default: 0.0.0.0)"
    )
    serve_parser.add_argument(
        "--port", type=int, default=8000, help="Porta (default: 8000)"
    )

    args = parser.parse_args()

    if args.command == "download":
        dataset.download()
    elif args.command == "train":
        train.train(output_dir=args.output)
    elif args.command == "translate":
        from .translate import predict

        result = predict(args.file)
        print(f"🤖 {result['phrase']}")
        print(f"   Intent: {result['intent']} | Confidenza: {result['confidence']:.1%}")
    elif args.command == "serve":
        from . import web
        web.serve(host=args.host, port=args.port)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
