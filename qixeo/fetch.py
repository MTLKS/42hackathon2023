from get_access_token import get_access_token, DOMAIN
import sys
import subprocess
import json


def quote_if_hasspace(string: str) -> str:
    return f'"{string}"' if ' ' in string else string


def main():
    try:
        argc = len(sys.argv)
        if argc < 2:
            raise RuntimeError(f"Usage: {sys.argv[0]} <uri> <...params>")
        uri = sys.argv[1]
        args = sys.argv[2:]
        command = [
            'curl',
            '-H',
            f'Authorization: Bearer {get_access_token()}',
            f'{DOMAIN}/v2/{uri}?{"&".join(args)}'
        ]

        print("url:", command[-1], file=sys.stderr)
        child = subprocess.run(command, capture_output=True)
        if child.returncode != 0:
            raise RuntimeError(child.stderr.decode())
        try:
            content = json.loads(child.stdout)
        except Exception as e:
            # print(child.stdout.decode(), file=sys.stderr)
            raise RuntimeError("Invalid JSON response, likely a 404")
        json.dump(content, sys.stdout, indent='\t')
    except KeyboardInterrupt:
        exit(130)
    except KeyError as e:
        args = ", ".join(f"'{arg}'" for arg in e.args)
        print(f"{args} environment variable not set", file=sys.stderr)
        exit(1)
    except Exception as e:
        print('Error:', e, file=sys.stderr)
        exit(1)


if __name__ == "__main__":
  main()
