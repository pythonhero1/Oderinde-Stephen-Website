import { parseFragment, serialize } from 'parse5';
import { findElement, hasClass } from './html.mjs';
const labels = {name:'Your name',email:'Email address',company:'Company or website (optional)',service:'Service required',budget:'Project budget (optional)',timeline:'Preferred timeline (optional)',message:'Tell me about your project'};
const names = { yourname: 'name', emailaddress: 'email', companyorwebsiteoptional: 'company', servicerequired: 'service', projectbudgetoptional: 'budget', preferredtimelineoptional: 'timeline', tellmeaboutyourproject: 'message' };
export function configureContactForms(html, endpoint = '') {
  if (!html.includes('et_pb_contact_form')) return html;
  if (endpoint && !/^https:\/\/formspree\.io\/f\/[a-z0-9]{5,64}$/i.test(endpoint)) throw new Error('Use the exact HTTPS Formspree form endpoint.');
  // Divi's PHP submission handler is replaced; keep its CSS and surrounding layout.
  html = html.replace(/<script\b[^>]*src=["'][^"']*module-library-script-contact-form\.js[^"']*["'][^>]*>\s*<\/script>/gi, '');
  const form = findElement(html, node => node.tagName === 'form' && hasClass(node, 'et_pb_contact_form'));
  if (!form) return html;
  const loc = form.sourceCodeLocation;
  const fragment = parseFragment(html.slice(loc.startOffset, loc.endOffset));
  const root = fragment.childNodes.find(node => node.tagName === 'form');
  const attr = (node, key) => node.attrs?.find(item => item.name === key)?.value;
  const set = (node, key, value) => { node.attrs = node.attrs.filter(item => item.name !== key); if (value !== null) node.attrs.push({ name: key, value }); };
  set(root, 'method', 'post');
  set(root, 'action', endpoint || '#');
  function transform(node) {
    node.childNodes = (node.childNodes || []).filter(child => !(child.tagName === 'input' && attr(child,'type') === 'hidden') && !hasClass(child,'et_pb_contact_right'));
    if (['input','textarea','select'].includes(node.tagName)) {
      const field = names[attr(node, 'data-original_id')];
      if (field) {
        set(node,'name',field);
        set(node,'aria-label',labels[field]);
        set(node,'required',['name','email','service','message'].includes(field) ? '' : null);
        if (node.tagName !== 'select') set(node,'maxlength',field === 'message' ? '6000' : '254');
        if (field === 'email') { set(node,'type','email');set(node,'autocomplete','email'); }
        if (field === 'name') set(node,'autocomplete','name');
      }
    }
    if (node.tagName === 'button' && (!attr(node,'type') || attr(node,'type') === 'submit')) {
      set(node,'disabled',endpoint ? null : '');set(node,'aria-disabled',endpoint ? null : 'true');
    }
    for (const child of node.childNodes || []) transform(child);
  }
  transform(root);
  const notice = endpoint ? '' : '<p role="status">Contact form delivery is not enabled in this preview. Please email <a href="mailto:Contact@oderindestephen.com">Contact@oderindestephen.com</a>.</p>';
  const formHtml = serialize(fragment).replace(/(<form\b[^>]*>)/, '$1'+notice);
  html = html.slice(0,loc.startOffset)+formHtml+html.slice(loc.endOffset);
  if (!endpoint) html = html.replace('</body>', '<script>document.addEventListener("submit",function(e){if(e.target.matches(".et_pb_contact_form")){e.preventDefault();e.stopImmediatePropagation();}},true);</script></body>');
  return html;
}
