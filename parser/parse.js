'use strict';

const { PdfReader } = require('pdfreader');

function readPDFPages (buffer, reader=(new PdfReader())) {

  return new Promise((resolve, reject) => {
    let pages = [];
    reader.parseBuffer(buffer, (err, item) => {

      if (err) {
        console.log('erro', err)
      reject(err)
      }
      else if (!item) {      
      resolve(pages);
      }
      else if (item.page)
        pages.push({});

      else if (item.text) {
        const row = pages[pages.length-1][item.y] || [];
        row.push(item.text);
        pages[pages.length-1][item.y] = row;

      } else {
        //console.debug('teste 1');
      }

    });
  });

}

function parseToddPDF (pages) {

  const page = pages[0]; // We know there's only going to be one page

  // Declarative map of PDF data that we expect, based on Todd's structure
  const fields = {
    reqID: { row: '5.185', index: 0 },
    date: { row: '4.329', index: 0 },
    sku: { row: '12.235', index: 1 },
    name: { row: '13.466', index: 1 },
    foodGrade: { row: '14.698', index: 1 },
    unitPrice: { row: '15.928999999999998', index: 1 },
    location: { row: '17.16', index: 1 },
  };

  const data = {};

  // Assign the page data to an object we can return, as per
  // our field specification
  Object.keys(fields)
    .forEach((key) => {

      const field = fields[key];
      const val = page[field.row][field.index];

      // We don't want to lose leading zeros here, and can trust
      // any backend / data handling to worry about that. This is
      // why we don't coerce to Number.
      data[key] = val;

    });

  // Manually fixing up some text fields so theyre usable
  data.reqID = data.reqID.slice('Requsition ID: '.length);
  data.date = data.date.slice('Date: '.length);

  return data;

}

function parseBill (pages) {

  const page = pages[0]; // We know there's only going to be one page


  // Achar o cabeçalho de subseção: Parcelamentos
  // Achar o cabeçalho da lista: Compra, Data, Descrição, Parcela, R$, US$
  // Achar o cabeçalho da próxima subseção: Despesas
  //const searchValue = [/Parcelamentos/i,/CompraDataDescriçãoParcela/i,/Despesas/i];

  // flag: se importa somente linhas que tiverem todas as colunas
  // flag: se tem iteração, ou seja, se importa somente a primeira ocorrência ou todas.
  // flag: colocar um controle para não importar a iteração se chegar o fim do arquivo e não encontrar o footer
  const parseObj = {
      searchValue: [/PagamentoeDemaisCréditos/gi,/Compra/i,/Parcelamentos/i], 
      fields: {
        data: 0,
        descricao: 1,
        parcela: 2,
        valor: 3,
      }
  }
  //let stage = { searchSection: 0, searchHeader: 1, extraction: 2 };
  let stageCounter = 0;
  // 0 -> 1 -> 2 -> 0
  const keys = Object.keys(parseObj.fields);
  let list = [];

  for (let row in page) {
    //console.log(page[row]);
    if (row.length > 0){

      if (page[row].join('').search(parseObj.searchValue[stageCounter]) >= 0) {
        stageCounter ++;
        if(stageCounter == parseObj.searchValue.length) stageCounter = 0;
        //console.log(page[row][0]);
      } else if (stageCounter == parseObj.searchValue.length - 1) {


        if (keys.length == page[row].length) {
          let data = {};

          keys.forEach((key) => {

            const index = parseObj.fields[key];
      
            const val = page[row][index];
      
            data[key] = val;
      
          });        

          list.push(data);          
        }

      }    
    }    
  }

  return list;

}

module.exports = async function parse (buf, reader) {

  const data = await readPDFPages(buf, reader);
  //console.log({'beforeParse': data});
  const parsedData = parseBill(data);  
  //return data;
  return parsedData;

};
