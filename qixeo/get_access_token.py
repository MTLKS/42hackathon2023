import requests
import os

DOMAIN = "https://api.intra.42.fr"


def get_access_token():
    UID = os.environ['API_UID']
    SECRET = os.environ['API_SECRET']

    # Not sure why os.environ[] doesn't throw
    if not UID:
        raise EnvironmentError("API_UID environment variable not set")
    if not SECRET:
        raise EnvironmentError("API_SECRET environment variable not set")
    headers = {'Content-type':'application/json'}
    r = requests.post(f"{DOMAIN}/oauth/token?grant_type=client_credentials&client_id={UID}&client_secret={SECRET}", headers=headers)
    r.raise_for_status()
    return r.json()['access_token']


if __name__ == "__main__":
    try:
        print(get_access_token())
        exit()
    except KeyError as e:
        print(f"{e.args} environment variable not set")
    except Exception as e:
        print(f"{e.__class__.__name__}:", e)
    exit(1)
