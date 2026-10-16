import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import * as XLSX from 'xlsx';
import { Exam, Question } from '../src/types/index.ts';

/**
 * Generate a DOCX document for an Exam
 */
export async function generateExamDocx(
  exam: Exam,
  variantCode: string = '101',
  type: 'student' | 'answer_key' | 'full_solution' = 'student'
): Promise<Buffer> {
  const variant = exam.variants.find((v) => v.variantCode === variantCode);
  const questions = variant ? variant.shuffledQuestions : exam.questions;

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'BỘ GIÁO DỤC VÀ ĐÀO TẠO - NGÂN HÀNG ĐỀ THI QUỐC GIA',
          bold: true,
          size: 24
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: exam.title.toUpperCase(),
          bold: true,
          size: 28
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Môn: ${exam.subjectName} | Thời gian: ${exam.durationMinutes} phút | Mã đề thi: ${variantCode}`,
          italics: true,
          size: 22
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: type === 'student' ? '--- ĐỀ THI CHÍNH THỨC (DÀNH CHO THÍ SINH) ---' : type === 'answer_key' ? '--- ĐÁP ÁN ĐỀ THI ---' : '--- BẢN LỜI GIẢI CHI TIẾT ---',
          bold: true,
          color: '1E3A8A',
          size: 20
        })
      ]
    }),
    new Paragraph({ text: '' })
  ];

  if (type === 'student' || type === 'full_solution') {
    questions.forEach((q, idx) => {
      // Question Title & Content
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Câu ${idx + 1} (${q.defaultPoints} điểm): `,
              bold: true
            }),
            new TextRun({
              text: q.content.replace(/\$/g, '')
            })
          ]
        })
      );

      // Options
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          children.push(
            new Paragraph({
              indent: { left: 720 },
              children: [
                new TextRun({
                  text: `${opt.id}. `,
                  bold: true
                }),
                new TextRun({
                  text: opt.content.replace(/\$/g, '')
                })
              ]
            })
          );
        });
      }

      // True/False Propositions
      if (q.propositions && q.propositions.length > 0) {
        q.propositions.forEach((prop) => {
          children.push(
            new Paragraph({
              indent: { left: 720 },
              children: [
                new TextRun({
                  text: `${prop.id}) `,
                  bold: true
                }),
                new TextRun({
                  text: prop.statement
                })
              ]
            })
          );
        });
      }

      // If full solution requested
      if (type === 'full_solution') {
        const correctStr = q.correctAnswers?.length
          ? `Đáp án đúng: ${q.correctAnswers.join(', ')}`
          : q.acceptedAnswers?.length
          ? `Đáp án chấp nhận: ${q.acceptedAnswers.join(' / ')}`
          : '';

        if (correctStr) {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              children: [
                new TextRun({
                  text: correctStr,
                  bold: true,
                  color: '047857'
                })
              ]
            })
          );
        }

        if (q.explanation) {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              children: [
                new TextRun({
                  text: `Lời giải: ${q.explanation.replace(/\$/g, '')}`,
                  italics: true,
                  color: '4B5563'
                })
              ]
            })
          );
        }
      }

      children.push(new Paragraph({ text: '' }));
    });
  }

  // Answer Key Section if requested
  if (type === 'answer_key') {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'BẢNG ĐÁP ÁN VÀ THANG ĐIỂM', bold: true })]
      })
    );

    questions.forEach((q, idx) => {
      let ans = '';
      if (q.questionType === 'true_false' && q.propositions) {
        ans = q.propositions.map((p) => `${p.id}: ${p.isCorrect ? 'Đ' : 'S'}`).join(' | ');
      } else if (q.correctAnswers && q.correctAnswers.length > 0) {
        ans = q.correctAnswers.join(', ');
      } else if (q.acceptedAnswers && q.acceptedAnswers.length > 0) {
        ans = q.acceptedAnswers.join(' / ');
      } else {
        ans = 'Chấm theo Rubric';
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${idx + 1}: `, bold: true }),
            new TextRun({ text: ans, bold: true, color: '059669' }),
            new TextRun({ text: ` (${q.defaultPoints}đ - ${q.topic})`, italics: true })
          ]
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generate Excel (.xlsx) file for Question Bank backup or Exam Answer Sheet
 */
export function generateQuestionBankExcel(questions: Question[]): Buffer {
  const data = questions.map((q, idx) => ({
    STT: idx + 1,
    'Mã câu hỏi': q.code,
    'Môn học': q.subjectName,
    'Dạng câu hỏi': q.questionType,
    'Chủ đề': q.topic,
    'Mức độ khó': q.difficulty,
    'Điểm mặc định': q.defaultPoints,
    'Nội dung câu hỏi': q.content,
    'Phương án': q.options?.map((o) => `${o.id}. ${o.content}`).join(' | ') || '',
    'Đáp án đúng': q.correctAnswers?.join(', ') || q.acceptedAnswers?.join(' / ') || '',
    'Lời giải': q.explanation || '',
    'Trạng thái': q.verificationStatus,
    'Nguồn trích xuất': q.sourceDocumentName || '',
    'Độ tin cậy (%)': q.confidenceScore
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'NganHangCauHoi');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function generateExamAnswersExcel(exam: Exam): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const variant of exam.variants) {
    const data = variant.shuffledQuestions.map((q, idx) => {
      let ans = '';
      if (q.questionType === 'true_false' && q.propositions) {
        ans = q.propositions.map((p) => `${p.id}:${p.isCorrect ? 'Đ' : 'S'}`).join('; ');
      } else if (q.correctAnswers) {
        ans = q.correctAnswers.join(', ');
      } else if (q.acceptedAnswers) {
        ans = q.acceptedAnswers.join(' / ');
      }

      return {
        'Câu số': idx + 1,
        'Mã câu hỏi': q.code,
        'Dạng câu': q.questionType,
        'Đáp án chuẩn': ans,
        'Điểm số': q.defaultPoints,
        'Chủ đề': q.topic,
        'Độ khó': q.difficulty
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, `MaDe_${variant.variantCode}`);
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
