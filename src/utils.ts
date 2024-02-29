import { BooleanOption } from "necord";

export function monthNameToNumber(monthName: string) {
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  return monthNames.indexOf(monthName.toLowerCase()) + 1;
}

export class ForceDto {
  @BooleanOption({
    name: 'force',
    description: "Export feedback regardless there's teams without feedbacks",
    required: false
  })
  force: boolean;
}

function getTimeslotPeriod(period: string) {
  if (period === "AM") {
    return 0;
  } else if (period === "PM") {
    return 12;
  } else {
    console.error(period, "is neither AM nor PM");
    return NaN;
  }
}

export function convertTimeslotStringToNumber(timeslot: string): number {
  const offset = getTimeslotPeriod(timeslot.slice(-2));
  const str = timeslot.substring(0, timeslot.length - 2);
  const [hour, minute] = str.split(':').map(Number);

  return offset + hour + (minute ? minute / 60 : 0);
}
