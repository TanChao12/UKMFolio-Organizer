/* Tiny dependency-free XLSX writer: OPC XML ZIP using uncompressed entries. */
const FolioXLSX=(()=>{
 const enc=new TextEncoder();
 const xml=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
 const uint16=(v)=>[v&255,(v>>>8)&255],uint32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
 const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
 const crc32=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
 function directoryEntry(nameSize, dataSize, crc, localOffset) {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, dataSize, true);
  view.setUint32(24, dataSize, true);
  view.setUint16(28, nameSize, true);
  view.setUint32(42, localOffset, true);
  return bytes;
 }
 function zip(files){let offset=0;const entries=[],central=[];for(const [name,content]of Object.entries(files)){const n=enc.encode(name),data=enc.encode(content),crc=crc32(data);const header=new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0,...uint32(crc),...uint32(data.length),...uint32(data.length),...uint16(n.length),0,0]);entries.push(header,n,data);central.push(directoryEntry(n.length, data.length, crc, offset), n);offset+=header.length+n.length+data.length;}const centralSize=central.reduce((n,b)=>n+b.length,0);const end=new Uint8Array([80,75,5,6,0,0,0,0,...uint16(Object.keys(files).length),...uint16(Object.keys(files).length),...uint32(centralSize),...uint32(offset),0,0]);return new Blob([...entries,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
 function col(i){let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
 function sheet(rows){let body='';rows.forEach((r,i)=>{body+=`<row r="${i+1}">`;r.forEach((v,j)=>{body+=`<c r="${col(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;});body+='</row>';});return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;}
 function build(tabs){const files={'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+tabs.map((t,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>','_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+tabs.map((t,i)=>`<sheet name="${xml(t.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>','xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+tabs.map((t,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>'};tabs.forEach((t,i)=>files[`xl/worksheets/sheet${i+1}.xml`]=sheet(t.rows));return zip(files);}
 return{build};
})();
