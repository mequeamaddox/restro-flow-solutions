import ReactPDF from '@react-pdf/renderer';
const { Document, Page, Text, View, StyleSheet, pdf } = ReactPDF;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  checkNumber: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'right',
  },
  checkSection: {
    paddingBottom: 20,
    marginBottom: 20,
    minHeight: 250,
    borderBottom: '2 dashed',
  },
  payToLine: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
  },
  amountBox: {
    border: 1,
    padding: 5,
    width: 100,
    textAlign: 'right',
  },
  amountWords: {
    marginTop: 10,
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 5,
  },
  signature: {
    marginTop: 30,
    borderTop: 1,
    paddingTop: 5,
    width: 200,
  },
  stubSection: {
    marginTop: 20,
  },
  stubTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: '#ddd',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  col1: { width: '40%', paddingLeft: 5 },
  col2: { width: '30%', textAlign: 'right', paddingRight: 5 },
  col3: { width: '30%', textAlign: 'right', paddingRight: 5 },
  totalRow: {
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
  },
  flexRow: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  mt5: {
    marginTop: 5,
  },
  mt10: {
    marginTop: 10,
  },
  mt15: {
    marginTop: 15,
  },
  mb5: {
    marginBottom: 5,
  },
  mb10: {
    marginBottom: 10,
  },
  textRight: {
    textAlign: 'right',
  },
  fontSize8: {
    fontSize: 8,
  },
  fontSize12: {
    fontSize: 12,
  },
  bgGray: {
    backgroundColor: '#e0e0e0',
  },
  p8: {
    padding: 8,
  },
});

export interface PaycheckData {
  checkNumber: string;
  payDate: string;
  employeeName: string;
  employeeAddress: string;
  netPay: string;
  regularHours: string;
  overtimeHours: string;
  regularRate: string;
  overtimeRate: string;
  regularPay: string;
  overtimePay: string;
  grossPay: string;
  federalTax: string;
  stateTax: string;
  socialSecurity: string;
  medicare: string;
  totalDeductions: string;
  bonuses?: string;
  tips?: string;
  companyName: string;
  companyAddress: string;
  periodStart: string;
  periodEnd: string;
}

function convertNumberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const thousands = ['', 'THOUSAND', 'MILLION'];

  if (num === 0) return 'ZERO';
  if (num < 0) return 'NEGATIVE ' + convertNumberToWords(-num);

  let result = '';
  let thousandIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk !== 0) {
      let chunkWords = '';
      
      const hundreds = Math.floor(chunk / 100);
      if (hundreds > 0) {
        chunkWords += ones[hundreds] + ' HUNDRED ';
      }
      
      const remainder = chunk % 100;
      if (remainder >= 20) {
        chunkWords += tens[Math.floor(remainder / 10)] + ' ';
        if (remainder % 10 > 0) {
          chunkWords += ones[remainder % 10] + ' ';
        }
      } else if (remainder >= 10) {
        chunkWords += teens[remainder - 10] + ' ';
      } else if (remainder > 0) {
        chunkWords += ones[remainder] + ' ';
      }
      
      chunkWords += thousands[thousandIndex] + ' ';
      result = chunkWords + result;
    }
    
    num = Math.floor(num / 1000);
    thousandIndex++;
  }
  
  return result.trim();
}

export async function generatePaycheckPDF(data: PaycheckData): Promise<Buffer> {
  const netAmount = parseFloat(data.netPay);
  const dollarAmount = Math.floor(netAmount);
  const centsAmount = Math.round((netAmount % 1) * 100);
  const amountInWords = convertNumberToWords(dollarAmount);

  // Build document object manually
  const doc: any = {
    $$typeof: Symbol.for('react.element'),
    type: Document,
    props: {
      children: {
        $$typeof: Symbol.for('react.element'),
        type: Page,
        props: {
          size: 'LETTER',
          style: styles.page,
          children: [
            // Check section
            {
              $$typeof: Symbol.for('react.element'),
              type: View,
              props: {
                style: styles.checkSection,
                children: [
                  {
                    $$typeof: Symbol.for('react.element'),
                    type: View,
                    props: {
                      style: styles.header,
                      children: [
                        { $$typeof: Symbol.for('react.element'), type: Text, props: { style: styles.companyName, children: data.companyName } },
                        { $$typeof: Symbol.for('react.element'), type: Text, props: { children: data.companyAddress } }
                      ]
                    }
                  },
                  { $$typeof: Symbol.for('react.element'), type: Text, props: { style: styles.checkNumber, children: `Check #${data.checkNumber}` } },
                  { $$typeof: Symbol.for('react.element'), type: Text, props: { children: `Date: ${new Date(data.payDate).toLocaleDateString()}` } },
                  {
                    $$typeof: Symbol.for('react.element'),
                    type: View,
                    props: {
                      style: styles.payToLine,
                      children: [
                        {
                          $$typeof: Symbol.for('react.element'),
                          type: View,
                          props: {
                            style: styles.flex1,
                            children: [
                              { $$typeof: Symbol.for('react.element'), type: Text, props: { children: 'PAY TO THE ORDER OF:' } },
                              { $$typeof: Symbol.for('react.element'), type: Text, props: { style: [styles.bold, styles.mt5], children: data.employeeName } }
                            ]
                          }
                        },
                        {
                          $$typeof: Symbol.for('react.element'),
                          type: View,
                          props: {
                            style: styles.amountBox,
                            children: { $$typeof: Symbol.for('react.element'), type: Text, props: { children: `$${parseFloat(data.netPay).toFixed(2)}` } }
                          }
                        }
                      ]
                    }
                  },
                  {
                    $$typeof: Symbol.for('react.element'),
                    type: View,
                    props: {
                      style: styles.amountWords,
                      children: { $$typeof: Symbol.for('react.element'), type: Text, props: { children: `${amountInWords} DOLLARS AND ${centsAmount}/100` } }
                    }
                  },
                  {
                    $$typeof: Symbol.for('react.element'),
                    type: View,
                    props: {
                      style: styles.signature,
                      children: { $$typeof: Symbol.for('react.element'), type: Text, props: { style: styles.fontSize8, children: 'Authorized Signature' } }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }
  };

  const pdfStream = pdf(doc);
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = [];
    pdfStream.on('data', (chunk: any) => chunks.push(chunk));
    pdfStream.on('end', () => resolve(Buffer.concat(chunks)));
    pdfStream.on('error', reject);
  });

  return buffer;
}
