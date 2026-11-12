import { Usuario } from './Usuario.js';
import { Categoria } from './Categoria.js';
import { FonteDestino } from './FonteDestino.js';
import { Lancamento } from './Lancamento.js';

Usuario.hasMany(Categoria, { foreignKey: 'usuario_id' });
Categoria.belongsTo(Usuario, { foreignKey: 'usuario_id' });

Usuario.hasMany(FonteDestino, { foreignKey: 'usuario_id' });
FonteDestino.belongsTo(Usuario, { foreignKey: 'usuario_id' });

Usuario.hasMany(Lancamento, { foreignKey: 'usuario_id' });
Lancamento.belongsTo(Usuario, { foreignKey: 'usuario_id' });

Categoria.hasMany(Lancamento, { foreignKey: 'categoria_id' });
Lancamento.belongsTo(Categoria, { foreignKey: 'categoria_id' });

FonteDestino.hasMany(Lancamento, { foreignKey: 'fonte_destino_id' });
Lancamento.belongsTo(FonteDestino, { foreignKey: 'fonte_destino_id' });

export { Usuario, Categoria, FonteDestino, Lancamento };