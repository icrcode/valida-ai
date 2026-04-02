import jwt from 'jsonwebtoken';

type Perfil = 'estudante' | 'coordenador' | 'admin';

export function gerarToken(perfil: Perfil = 'estudante', sub = 'usuario-id'): string {
  const segredo = process.env.JWT_SECRET ?? 'segredo-de-teste';
  return jwt.sign(
    { sub, perfil, email: `${perfil}@test.com`, nome: 'Usuário Teste' },
    segredo,
    { expiresIn: '1h' },
  );
}
