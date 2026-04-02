import jwt from 'jsonwebtoken';

type Perfil = 'estudante' | 'coordenador' | 'admin';

export function gerarToken(perfil: Perfil = 'estudante', sub = 'usuario-id'): string {
  return jwt.sign(
    { sub, perfil, email: `${perfil}@test.com`, nome: 'Usuário Teste' },
    String(process.env.JWT_SECRET),
    { expiresIn: '1h' },
  );
}
