import { describe, expect, it } from 'vitest';
import { arxivIdFrom, locate, paperLinks, textFragment } from '../content/deeplinks';

const arxivOld = { arxiv: '2006.11239', url: '', pdf: '', html: '', code: '', project: '' };
const arxivNew = { ...arxivOld, arxiv: '2410.24164' };
const blog = { arxiv: '', url: 'https://bfl.ai/models/flux-3-action', pdf: '', html: '', code: '', project: '' };

describe('arXiv ids', () => {
  it('extracts ids from links and bare ids', () => {
    expect(arxivIdFrom('2006.11239')).toBe('2006.11239');
    expect(arxivIdFrom('https://arxiv.org/abs/2006.11239v2')).toBe('2006.11239v2');
    expect(arxivIdFrom('https://arxiv.org/pdf/2303.01469.pdf')).toBe('2303.01469');
    expect(arxivIdFrom('https://arxiv.org/html/2410.24164v1#S3')).toBe('2410.24164v1');
    expect(arxivIdFrom('https://ar5iv.labs.arxiv.org/html/1503.03585')).toBe('1503.03585');
    expect(arxivIdFrom('hep-th/9901001')).toBe('hep-th/9901001');
    expect(arxivIdFrom('https://example.com/2006.11239')).toBe('');
  });
});

describe('paper links', () => {
  it('derives abstract, PDF and HTML links; old papers use ar5iv', () => {
    expect(paperLinks(arxivOld)).toEqual({
      primary: 'https://arxiv.org/abs/2006.11239',
      abs: 'https://arxiv.org/abs/2006.11239',
      pdf: 'https://arxiv.org/pdf/2006.11239',
      html: 'https://ar5iv.labs.arxiv.org/html/2006.11239',
    });
    expect(paperLinks(arxivNew).html).toBe('https://arxiv.org/html/2410.24164');
    expect(paperLinks(blog)).toEqual({ primary: 'https://bfl.ai/models/flux-3-action' });
  });
});

describe('locators', () => {
  it('pages go to the PDF', () => {
    expect(locate(arxivOld, 'p. 4')).toEqual({ href: 'https://arxiv.org/pdf/2006.11239#page=4', target: 'pdf', exact: true });
    expect(locate(arxivOld, 'page 12').href).toBe('https://arxiv.org/pdf/2006.11239#page=12');
    expect(locate(blog, 'p. 4')).toMatchObject({ href: blog.url, exact: false });
  });

  it('sections and appendices go to LaTeXML anchors', () => {
    expect(locate(arxivOld, '§3.4').href).toBe('https://ar5iv.labs.arxiv.org/html/2006.11239#S3.SS4');
    expect(locate(arxivOld, 'Section 4').href).toBe('https://ar5iv.labs.arxiv.org/html/2006.11239#S4');
    expect(locate(arxivOld, 'sec. 2.1.3').href).toBe('https://ar5iv.labs.arxiv.org/html/2006.11239#S2.SS1.SSS3');
    expect(locate(arxivNew, 'Appendix B.2').href).toBe('https://arxiv.org/html/2410.24164#A2.SS2');
  });

  it('figures and tables target their captions', () => {
    expect(locate(arxivOld, 'Figure 3').href).toBe('https://ar5iv.labs.arxiv.org/html/2006.11239#:~:text=Figure%203%3A');
    expect(locate(blog, 'Table 6').href).toBe('https://bfl.ai/models/flux-3-action#:~:text=Table%206%3A');
  });

  it('quotes become text fragments, long ones as start,end', () => {
    expect(locate(arxivOld, '"predict the noise"').href).toBe('https://ar5iv.labs.arxiv.org/html/2006.11239#:~:text=predict%20the%20noise');
    expect(locate(blog, '', 'a world-action model').href).toBe('https://bfl.ai/models/flux-3-action#:~:text=a%20world%2Daction%20model');
    expect(textFragment('one two three four five six seven eight nine ten')).toBe('#:~:text=one%20two%20three%20four,seven%20eight%20nine%20ten');
  });

  it('anything else opens the paper', () => {
    expect(locate(arxivOld, 'the bit about variance')).toEqual({ href: 'https://arxiv.org/abs/2006.11239', target: 'page', exact: false });
  });
});
