import * as bcrypt from 'bcrypt';

const hash = await bcrypt.hash('Zephix!123', 10);
console.log('Hash:', hash);

const match = await bcrypt.compare('Zephix!123', hash);
console.log('Match:', match);
