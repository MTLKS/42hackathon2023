from datetime import datetime
import datetime as dt
import requests
import sys
import os
import json
from get_access_token import get_access_token, DOMAIN

def request(uri: str, *args):
    print(f"{DOMAIN}{uri}?access_token={ACCESS_TOKEN}&{'&'.join(args)}", file=sys.stderr)
    r = requests.get(f"{DOMAIN}{uri}?access_token={ACCESS_TOKEN}&{'&'.join(args)}")
    r.raise_for_status()
    return r.json()


def get_all(uri: str, *args):
    PAGE_MAX = 100
    i = 1
    campuses = []

    while True:
        campus = request(uri,
                         f"page[number]={i}",
                         f"page[size]={PAGE_MAX}",
                         *args)
        campuses += campus
        if len(campus) != PAGE_MAX:
            break
        i += 1
    return campuses


def main():
    try:
        global ACCESS_TOKEN; ACCESS_TOKEN = get_access_token()

        json.dump(get_all('/v2/campus', 'sort=id'), sys.stdout, indent='\t')
        exit()
    except KeyboardInterrupt:
        exit(130)
    except KeyError as e:
        print(f"{e.args} environment variable not set")
    except Exception as e:
        print(f"{e.__class__.__name__}:", e, file=sys.stderr)
    exit(1)


if __name__ == "__main__":
    main()
