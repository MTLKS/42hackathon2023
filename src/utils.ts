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
