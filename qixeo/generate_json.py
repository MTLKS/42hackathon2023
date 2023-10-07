from datetime import datetime
import datetime as dt
import requests
import sys
import os
import json


# 34 is the id referring to 42 Kuala Lumpur
CAMPUS_ID = 34
DOMAIN = "https://api.intra.42.fr"


def request(uri: str, *args):
    r = requests.get(f"{DOMAIN}{uri}?access_token={ACCESS_TOKEN}&{'&'.join(args)}")
    r.raise_for_status()
    return r.json()


def init_access_token():
    global ACCESS_TOKEN
    UID = os.environ['APP_UID']
    SECRET = os.environ['APP_SECRET']

    # Not sure why os.environ[] doesn't throw
    if not UID:
        raise EnvironmentError("APP_UID environment variable not set")
    if not SECRET:
        raise EnvironmentError("APP_SECRET environment variable not set")
    headers = {'Content-type':'application/json'}
    r = requests.post(f"{DOMAIN}/oauth/token?grant_type=client_credentials&client_id={UID}&client_secret={SECRET}", headers=headers)
    r.raise_for_status()
    ACCESS_TOKEN = r.json()['access_token']


def get_teams(project_id: str | int):
    now = datetime.now().strftime('%Y-%m-%d')
    start = (datetime.now() - dt.timedelta(weeks=4)).strftime('%Y-%m-%d')
    users = request(f'/v2/projects/{project_id}/projects_users',
                        f"filter[campus]={CAMPUS_ID}",
                        #  f"filter[status]=waiting_for_correction,in_progress", # data unavailable at the moment
                        f"range[created_at]={start},{now}",
                        )
    return {user['teams'][0]['name']: user['teams'][0] for user in users}


def main():
    argc = len(sys.argv)
    if argc == 1:
        print(f"Usage: python {sys.argv[0]} <project_id>", file=sys.stderr)
    elif argc != 2:
        print("Too many arguments", file=sys.stderr)
    else:
        try:
            init_access_token()
            project_id = sys.argv[1]
            print(f"Getting teams for project {project_id}", file=sys.stderr)
            json.dump(get_teams(project_id), sys.stdout, indent='\t')
            exit()
        except KeyboardInterrupt:
            exit(130)
        except Exception as e:
            print(f"{e.__class__.__name__}:", e, file=sys.stderr)
        exit(1)

if __name__ == "__main__":
    main()

