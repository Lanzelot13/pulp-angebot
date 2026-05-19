import { fetchTeam } from './src/lib/team.ts';
const result = await fetchTeam();
console.log('Found', result.people.length, 'people');
for (const p of result.people.slice(0, 5)) {
  console.log(' -', p.slug, '|', p.name, '|', p.role, '|', p.imageUrl ? 'img:OK' : 'no-img', '|', p.email || '-', '|', p.phone || '-');
}
console.log('... +', Math.max(0, result.people.length - 5), 'more');
