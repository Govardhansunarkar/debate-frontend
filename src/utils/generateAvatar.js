export const generateAvatar = (name) => {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8'];
  const hash = name.split('').reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return `https://ui-avatars.com/api/?name=${initials}&background=${color}&color=fff`;
};
