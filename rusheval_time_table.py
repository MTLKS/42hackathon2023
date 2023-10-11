import sys
import json
from matplotlib import pyplot as plt
from matplotlib import colors as pltcolor
from matplotlib import table as plttable
import pymongo as mongo


database = mongo.MongoClient('mongodb://127.0.0.1:27017/nest').get_database('nest')


def create_figure():
    plt.figure(
        facecolor=(.831, .831, .831),
        edgecolor=(.39, .39, .39),
        tight_layout={'pad':1},
        dpi=200,
        figsize=(8, 4)
    )
    plt.gca().get_xaxis().set_visible(False)
    plt.gca().get_yaxis().set_visible(False)
    plt.box(on=None)
    title_text = plt.suptitle("Evaluation Time Table")
    title_text.set_fontsize(20)
    title_text.set_fontweight('bold')
    title_text.set_ha('center')
    title_text.set_x(0.5)
    title_text.set_y(0.9)


def get_data_map(sessions: list) -> dict[str, list[str]]:
    timeslots = [slot['timeslot'] for slot in database.get_collection('timeslots').find()]
    data = {time: [] for time in timeslots}
    for session in sessions:
        team = f"$\\bf Team: {session['leader']}$"
        cadet = f"$\\bf Cadet:$ {session['evaluator']}"
        data[session['time']].append(f"{team}\n{cadet}")
    return data


def set_cells_colors(table: plttable.Table):
    purple_blue = lambda x: ["#dad1e9", "#c8daf8"][x == -1 or x % 2 == 0]
    yellow_white = lambda x: ["#fff2cc", "#ffffff"][x == -1 or x % 2 == 0]
    for pos, cell in table.get_celld().items():
        y, x = pos
        if y % 2 == 0:
            facecolor = purple_blue(x)
        else:
            facecolor = yellow_white(x + ((y + 1) / 4).is_integer())
        # transparentize empty slot
        if cell.get_text().get_text() == '':
            facecolor += "50"
            cell.set_edgecolor("#393939")
        cell.set_facecolor(pltcolor.to_rgba(facecolor))


def set_fonts(table: plttable.Table):
    table.auto_set_font_size(False)
    for cell in table.get_celld().values():
        cell.set_width(.2)
        cell.set_height(cell.get_height() * 2.5)


def draw_session(sessions: list):
    create_figure()
    data = get_data_map(sessions)
    for lst in data.values():
        # Why not [''] * (4 - len(lst)) ?
        # Just in case I need to modify each cell independently.
        # Since that expression would create shallow copy
        lst += ['' for _ in range(4 - len(lst))]
    table = plt.table(
            rowLabels=list(data.keys()),
            rowLoc='center',
            cellLoc='center',
            loc='center',
            cellText=list(data.values()),
        )
    set_cells_colors(table)
    set_fonts(table)


def get_session(teams: list):
    get_login = lambda user: user['intraName']
    def get_eval_data(team):
        return {
            'leader': get_login(team['teamLeader']),
            'evaluator': get_login(team['evaluator']),
            'time': team['timeslot']['timeslot']
        }

    return [get_eval_data(team) for team in teams]


def get_session_file(filename: str):
    return get_session(json.load(open(filename)))


def main():
    try:
        teams = list(database.get_collection('teams').find())
        if len(sys.argv) != 2:
            raise RuntimeError(f"Usage: {sys.argv[0]} <dst image>")
        outfile = sys.argv[1]
        # draw_session(get_session_file("testmatch.json"))
        draw_session(get_session(teams))
        plt.savefig(outfile)
    except KeyboardInterrupt:
        exit(130)
    except Exception as e:
        print('Error:', e, file=sys.stderr)
        exit(1)


if __name__ == "__main__":
    main()
