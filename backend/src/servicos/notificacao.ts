import registrador from '../utils/registrador';

export interface DadosNotificacao {
  destinatarioId: string;
  destinatarioEmail: string;
  destinatarioNome: string;
  assunto: string;
  mensagem: string;
}

/**
 * Envia uma notificação ao destinatário.
 * Por ora registra em log. Para ativar e-mail, implemente o bloco
 * marcado com TODO abaixo (Nodemailer ou SendGrid).
 */
export async function notificar(dados: DadosNotificacao): Promise<void> {
  registrador.info(
    `[notificacao] → ${dados.destinatarioNome} <${dados.destinatarioEmail}> | ${dados.assunto}`,
  );

  // TODO: integrar Nodemailer/SendGrid
  // Exemplo com Nodemailer:
  // await transporter.sendMail({
  //   to: dados.destinatarioEmail,
  //   subject: dados.assunto,
  //   text: dados.mensagem,
  // });
}
