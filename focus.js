const FolioFocus = (() => {
  const DAY = 86_400_000;
  const OFFSET = 8 * 3_600_000;
  const dayNumber = time => Math.floor((time + OFFSET) / DAY);
  const dueDate = record => Date.parse(record.due || '');
  function queue(records, now = Date.now()) {
    const today = dayNumber(now);
    const pending = records.filter(r => !r.completed && r.del !== 1);
    const upcoming = pending.filter(r => dueDate(r) >= now).sort((a, b) => dueDate(a) - dueDate(b));
    const imminent = upcoming.filter(r => dayNumber(dueDate(r)) <= today + 1);
    const late = pending.filter(r => dueDate(r) < now).sort((a, b) => dueDate(b) - dueDate(a));
    const later = upcoming.slice(imminent.length);
    const undated = pending.filter(r => !Number.isFinite(dueDate(r))).sort((a, b) => a.title.localeCompare(b.title));
    return [...imminent, ...late.slice(0, 1), ...later, ...late.slice(1), ...undated].slice(0, 3);
  }
  function deadline(record, now = Date.now()) {
    const due = dueDate(record);
    if (!Number.isFinite(due)) return { label: 'No due date', tone: 'neutral' };
    if (due < now) return { label: record.completed ? 'Done' : 'Overdue', tone: record.completed ? 'neutral' : 'late' };
    const offset = dayNumber(due) - dayNumber(now);
    if (offset === 0) return { label: 'Due today', tone: 'soon' };
    if (offset === 1) return { label: 'Due tomorrow', tone: 'soon' };
    return { label: 'Upcoming', tone: 'neutral' };
  }
  function paginate(rows, requested, size = 8) {
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const page = Math.max(1, Math.min(requested, pages));
    const start = (page - 1) * size;
    const end = Math.min(start + size, rows.length);
    return { page, pages, start, end, rows: rows.slice(start, end) };
  }
  return { queue, deadline, paginate };
})();
