import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { fazerUploadCertificado } from './armazenamento';
import registrador from '../utils/registrador';

export interface DadosCertificado {
  documentoId: string;
  estudanteNome: string;
  estudanteEmail: string;
  coordenadorNome: string;
  titulo: string;
  tipo: string;
  cargaHoraria: number;
  dataAprovacao: Date;
}

export function gerarHash(documentoId: string): string {
  const aleatorio = crypto.randomBytes(16).toString('hex');
  return crypto
    .createHash('sha256')
    .update(`${documentoId}-${Date.now()}-${aleatorio}`)
    .digest('hex');
}

const TIPO_LEGIVEL: Record<string, string> = {
  certificado_curso: 'Certificado de Curso',
  certificado_evento: 'Certificado de Evento',
  declaracao_participacao: 'Declaração de Participação',
  comprovante_atividade: 'Comprovante de Atividade',
  artigo_publicado: 'Artigo Publicado',
  outro: 'Outro',
};

export async function gerarPDF(dados: DadosCertificado, urlVerificacao: string): Promise<Buffer> {
  const qrBuffer = await QRCode.toBuffer(urlVerificacao, {
    width: 120,
    margin: 2,
    color: { dark: '#1a3c6e', light: '#ffffff' },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const largura = doc.page.width;  // ~842
    const altura = doc.page.height;  // ~595

    // Borda decorativa dupla
    doc.rect(20, 20, largura - 40, altura - 40).lineWidth(3).stroke('#1a3c6e');
    doc.rect(28, 28, largura - 56, altura - 56).lineWidth(1).stroke('#4a90d9');

    // ── Cabeçalho ──
    doc
      .fontSize(28).fillColor('#1a3c6e').font('Helvetica-Bold')
      .text('CERTIFICADO', 0, 60, { align: 'center', width: largura });

    doc
      .fontSize(14).fillColor('#4a90d9').font('Helvetica')
      .text('DE CONCLUSÃO DE ATIVIDADE', 0, 95, { align: 'center', width: largura });

    doc.moveTo(80, 122).lineTo(largura - 80, 122).lineWidth(1).stroke('#cccccc');

    // ── Corpo ──
    doc
      .fontSize(14).fillColor('#333333').font('Helvetica')
      .text('Certificamos que', 0, 145, { align: 'center', width: largura });

    doc
      .fontSize(24).fillColor('#1a3c6e').font('Helvetica-Bold')
      .text(dados.estudanteNome, 0, 172, { align: 'center', width: largura });

    const tipoLegivel = TIPO_LEGIVEL[dados.tipo] ?? dados.tipo;
    const dataFormatada = dados.dataAprovacao.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    doc
      .fontSize(13).fillColor('#333333').font('Helvetica')
      .text(`concluiu com aprovação a atividade de ${tipoLegivel}`, 0, 215, {
        align: 'center', width: largura,
      });

    doc
      .fontSize(16).fillColor('#1a3c6e').font('Helvetica-Bold')
      .text(`"${dados.titulo}"`, 0, 242, { align: 'center', width: largura });

    doc
      .fontSize(13).fillColor('#333333').font('Helvetica')
      .text(`com carga horária de ${dados.cargaHoraria} horas`, 0, 274, {
        align: 'center', width: largura,
      });

    doc
      .fontSize(12).fillColor('#555555')
      .text(`aprovado em ${dataFormatada}`, 0, 300, { align: 'center', width: largura });

    // ── Assinatura do coordenador (centralizada) ──
    const assinaturaY = 370;
    doc.moveTo(largura / 2 - 120, assinaturaY).lineTo(largura / 2 + 120, assinaturaY)
      .lineWidth(1).stroke('#1a3c6e');

    doc
      .fontSize(13).fillColor('#1a3c6e').font('Helvetica-Bold')
      .text(dados.coordenadorNome, 0, assinaturaY + 6, { align: 'center', width: largura });

    doc
      .fontSize(10).fillColor('#555555').font('Helvetica')
      .text('Coordenador(a) Responsável', 0, assinaturaY + 22, { align: 'center', width: largura });

    // ── Rodapé: QR Code (canto inferior direito) e URL (canto inferior esquerdo) ──
    const qrTamanho = 80;
    const qrX = largura - 40 - qrTamanho - 10;
    const qrY = altura - 40 - qrTamanho - 30;
    doc.image(qrBuffer, qrX, qrY, { width: qrTamanho, height: qrTamanho });

    doc
      .fontSize(7).fillColor('#888888')
      .text('Verifique a autenticidade', qrX - 5, qrY + qrTamanho + 3, {
        width: qrTamanho + 10, align: 'center',
      });

    doc
      .fontSize(7).fillColor('#888888')
      .text('Verifique este certificado em:', 50, altura - 58, { width: largura - 220 });

    doc
      .fontSize(7).fillColor('#4a90d9')
      .text(urlVerificacao, 50, altura - 48, { width: largura - 220 });

    doc.end();
  });
}

export async function gerarEArmazenarCertificado(
  dados: DadosCertificado,
  urlFrontend: string,
): Promise<{ hash: string; caminhoArquivo: string; pdfBuffer: Buffer }> {
  const hash = gerarHash(dados.documentoId);
  const urlVerificacao = `${urlFrontend.replace(/\/+$/, '')}/verificar/${hash}`;

  const pdfBuffer = await gerarPDF(dados, urlVerificacao);

  const chaveArquivo = `certificados/${dados.documentoId}/${hash}.pdf`;
  await fazerUploadCertificado(pdfBuffer, chaveArquivo);

  registrador.info(
    `[certificado] gerado | documento=${dados.documentoId} | hash=${hash.slice(0, 12)}...`,
  );

  return { hash, caminhoArquivo: chaveArquivo, pdfBuffer };
}
