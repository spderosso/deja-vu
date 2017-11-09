export function generateId(): string {
  // use the full number!
  return Math.floor(Math.random() * 1000 * 1000 * 1000 * 1000 * 1000)
    .toString();
}

function downloadObject(filename, obj) {
  const element = document.createElement('a');
  const data = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(obj));

  element.setAttribute('href', data);
  element.setAttribute('download', filename);

  element.click();
}

