import 'reflect-metadata';
import { User } from '../modules/users/entities/user.entity';

const metadata = Reflect.getMetadataKeys(User);
console.log('User entity metadata:', metadata);

const columns = Reflect.getMetadata('design:type', User.prototype, 'firstName');
console.log('firstName metadata:', columns);
