const getDaysInMonth = (year: any, month: any) => {
	return new Date(year, month + 1, 0).getDate();
};

export const generateCalendarHelper = (year: any, month: any) => {
	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = new Date(year, month, 1).getDay();
	const weeks = [];
	let day = 1;

	for (let i = 0; i < 6; i++) {
		const week = [];
		for (let j = 0; j < 7; j++) {
			if (i === 0 && j < firstDay) {
				week.push(null);
			} else if (day > daysInMonth) {
				week.push(null);
			} else {
				const date = new Date(year, month, day);
				week.push(date);
				day++;
			}
		}
		weeks.push(week);
	}
	return weeks;
};

export const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];
