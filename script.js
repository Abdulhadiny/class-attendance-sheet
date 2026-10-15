// ==================================================
//  Class Attendance Sheet
// ==================================================

// ---------- 1. Data ----------
// All of the app's data lives in one object. It is saved in the browser's
// localStorage, so it is still there after you refresh the page.
//
//   data.days     -> class dates, newest first
//                    e.g. ['2026-10-15', '2026-10-14']
//   data.students -> one object per student
//                    e.g. { id: 1760531, name: 'Bobo', present: ['2026-10-15'] }
//
// A student's check-ins count is just how many dates are in their `present` list.

const STORAGE_KEY = 'class-attendance-sheet';

let data = loadData();
let sortAscending = true; // true = A to Z, false = Z to A

// ---------- 2. Page elements ----------
const headerRow = document.getElementById('header-row');
const studentRows = document.getElementById('student-rows');
const summary = document.getElementById('summary');
const addStudentForm = document.getElementById('add-student-form');
const studentNameInput = document.getElementById('student-name');
const addDayForm = document.getElementById('add-day-form');
const dayDateInput = document.getElementById('day-date');

// ---------- 3. Saving & loading ----------
function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  // First visit: no students yet, and one column for today.
  return { students: [], days: [todayISO()] };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- 4. Helpers ----------
// Today's date as 'YYYY-MM-DD' in local time.
// (We don't use toISOString() because that gives the date in UTC.)
function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// '2026-10-15' -> 'Thu 15 Oct'
function formatDay(isoDate) {
  const date = new Date(isoDate + 'T00:00'); // T00:00 = midnight, local time
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// plural(1, 'day') -> '1 day',  plural(3, 'day') -> '3 days'
function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// Create an element with an optional class name and text.
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// ---------- 5. Actions ----------
// Every action changes `data`, saves it, then redraws the table.

function addStudent(name) {
  data.students.push({ id: Date.now(), name: name, present: [] });
  saveData();
  render();
}

function removeStudent(student) {
  if (!confirm(`Remove ${student.name} from the register?`)) return;
  data.students = data.students.filter((s) => s.id !== student.id);
  saveData();
  render();
}

function addDay(isoDate) {
  if (data.days.includes(isoDate)) {
    alert(`${formatDay(isoDate)} is already on the register.`);
    return;
  }
  data.days.push(isoDate);
  data.days.sort().reverse(); // 'YYYY-MM-DD' strings sort by date, so this puts newest first
  saveData();
  render();
}

function removeDay(isoDate) {
  if (!confirm(`Remove ${formatDay(isoDate)} and all its ticks?`)) return;
  data.days = data.days.filter((d) => d !== isoDate);
  data.students.forEach((student) => {
    student.present = student.present.filter((d) => d !== isoDate);
  });
  saveData();
  render();
}

function toggleTick(student, isoDate) {
  if (student.present.includes(isoDate)) {
    student.present = student.present.filter((d) => d !== isoDate);
  } else {
    student.present.push(isoDate);
  }
  saveData();
  render();
}

// ---------- 6. Drawing the table ----------
function render() {
  renderHeader();
  renderRows();
  summary.textContent = `${plural(data.students.length, 'student')} · ${plural(data.days.length, 'class day')}`;
}

function renderHeader() {
  headerRow.innerHTML = '';

  headerRow.append(makeElement('th', 'col-avatar'));

  // The "Name" header is also the button that flips the sort order
  const nameHeader = makeElement('th', 'col-name');
  const sortButton = makeElement('button', 'sort-button', `Name ${sortAscending ? '↑' : '↓'}`);
  sortButton.addEventListener('click', () => {
    sortAscending = !sortAscending;
    render();
  });
  nameHeader.append(sortButton);
  headerRow.append(nameHeader);

  headerRow.append(makeElement('th', 'col-count', 'Check-ins'));

  // One header per class day
  data.days.forEach((isoDate) => {
    const dayHeader = makeElement('th', 'col-day');
    const removeButton = makeElement('button', 'remove-button', '×');
    removeButton.title = 'Remove this day';
    removeButton.addEventListener('click', () => removeDay(isoDate));
    dayHeader.append(makeElement('span', '', formatDay(isoDate)), removeButton);
    headerRow.append(dayHeader);
  });
}

function renderRows() {
  studentRows.innerHTML = '';

  if (data.students.length === 0) {
    const row = makeElement('tr');
    const cell = makeElement('td', 'empty', 'No students yet. Add one above to start the register.');
    cell.colSpan = 3 + data.days.length;
    row.append(cell);
    studentRows.append(row);
    return;
  }

  // Sort a copy so the saved order never changes
  const sorted = [...data.students].sort((a, b) => a.name.localeCompare(b.name));
  if (!sortAscending) sorted.reverse();

  sorted.forEach((student) => {
    const row = makeElement('tr');

    // Avatar: the first letter of the name in a circle
    const avatarCell = makeElement('td', 'col-avatar');
    avatarCell.append(makeElement('span', 'avatar', student.name.charAt(0).toUpperCase()));
    row.append(avatarCell);

    // Name, with a remove button that shows on hover
    const nameCell = makeElement('td', 'col-name');
    const removeButton = makeElement('button', 'remove-button', '×');
    removeButton.title = `Remove ${student.name}`;
    removeButton.addEventListener('click', () => removeStudent(student));
    nameCell.append(makeElement('span', '', student.name), removeButton);
    row.append(nameCell);

    // How many days this student was ticked present
    row.append(makeElement('td', 'col-count', student.present.length));

    // One tick box per class day
    data.days.forEach((isoDate) => {
      const isPresent = student.present.includes(isoDate);
      const cell = makeElement('td', 'col-day');
      const tick = makeElement('button', isPresent ? 'tick present' : 'tick', isPresent ? '✓' : '-');
      tick.setAttribute('aria-label', `${student.name}, ${formatDay(isoDate)}: ${isPresent ? 'present' : 'not ticked'}`);
      tick.addEventListener('click', () => toggleTick(student, isoDate));
      cell.append(tick);
      row.append(cell);
    });

    studentRows.append(row);
  });
}

// ---------- 7. Forms ----------
addStudentForm.addEventListener('submit', (event) => {
  event.preventDefault(); // stop the browser from reloading the page
  const name = studentNameInput.value.trim();
  if (name === '') return;
  addStudent(name);
  addStudentForm.reset();
  studentNameInput.focus();
});

addDayForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addDay(dayDateInput.value);
});

// ---------- 8. Start the app ----------
dayDateInput.value = todayISO();
render();
