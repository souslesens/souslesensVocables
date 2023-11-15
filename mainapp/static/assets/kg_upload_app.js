import{i as sn,r as v,j as g,a as ba,_ as ga,k as ha,d as Pt,e as ya,E as wa,l as xa,h as ka}from"./client-076dcbf0.js";var fn={exports:{}},Aa="SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED",Ca=Aa,Oa=Ca;function ln(){}function cn(){}cn.resetWarningCache=ln;var Sa=function(){function t(a,r,i,o,s,f){if(f!==Oa){var l=new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");throw l.name="Invariant Violation",l}}t.isRequired=t;function e(){return t}var n={array:t,bigint:t,bool:t,func:t,number:t,object:t,string:t,symbol:t,any:t,arrayOf:e,element:t,elementType:t,instanceOf:e,node:t,objectOf:e,oneOf:e,oneOfType:e,shape:e,exact:e,checkPropTypes:cn,resetWarningCache:ln};return n.PropTypes=n,n};fn.exports=Sa();var Ea=fn.exports;const h=sn(Ea);var un={exports:{}};/*!
	Copyright (c) 2018 Jed Watson.
	Licensed under the MIT License (MIT), see
	http://jedwatson.github.io/classnames
*/(function(t){(function(){var e={}.hasOwnProperty;function n(){for(var a=[],r=0;r<arguments.length;r++){var i=arguments[r];if(i){var o=typeof i;if(o==="string"||o==="number")a.push(i);else if(Array.isArray(i)){if(i.length){var s=n.apply(null,i);s&&a.push(s)}}else if(o==="object"){if(i.toString!==Object.prototype.toString&&!i.toString.toString().includes("[native code]")){a.push(i.toString());continue}for(var f in i)e.call(i,f)&&i[f]&&a.push(f)}}}return a.join(" ")}t.exports?(n.default=n,t.exports=n):window.classNames=n})()})(un);var Na=un.exports;const P=sn(Na),Ta={type:h.string,tooltip:h.bool,as:h.elementType},ce=v.forwardRef(({as:t="div",className:e,type:n="valid",tooltip:a=!1,...r},i)=>g.jsx(t,{...r,ref:i,className:P(e,`${n}-${a?"tooltip":"feedback"}`)}));ce.displayName="Feedback";ce.propTypes=Ta;const mn=ce,Pa=v.createContext({}),D=Pa,Ia=["xxl","xl","lg","md","sm","xs"],Fa="xs",ue=v.createContext({prefixes:{},breakpoints:Ia,minBreakpoint:Fa});function j(t,e){const{prefixes:n}=v.useContext(ue);return t||n[e]||e}function dn(){const{breakpoints:t}=v.useContext(ue);return t}function vn(){const{minBreakpoint:t}=v.useContext(ue);return t}const pn=v.forwardRef(({id:t,bsPrefix:e,className:n,type:a="checkbox",isValid:r=!1,isInvalid:i=!1,as:o="input",...s},f)=>{const{controlId:l}=v.useContext(D);return e=j(e,"form-check-input"),g.jsx(o,{...s,ref:f,type:a,id:t||l,className:P(n,e,r&&"is-valid",i&&"is-invalid")})});pn.displayName="FormCheckInput";const bn=pn,gn=v.forwardRef(({bsPrefix:t,className:e,htmlFor:n,...a},r)=>{const{controlId:i}=v.useContext(D);return t=j(t,"form-check-label"),g.jsx("label",{...a,ref:r,htmlFor:n||i,className:P(e,t)})});gn.displayName="FormCheckLabel";const Kt=gn;function ja(t,e){return v.Children.toArray(t).some(n=>v.isValidElement(n)&&n.type===e)}const hn=v.forwardRef(({id:t,bsPrefix:e,bsSwitchPrefix:n,inline:a=!1,reverse:r=!1,disabled:i=!1,isValid:o=!1,isInvalid:s=!1,feedbackTooltip:f=!1,feedback:l,feedbackType:c,className:u,style:m,title:b="",type:y="checkbox",label:A,children:k,as:x="input",...w},C)=>{e=j(e,"form-check"),n=j(n,"form-switch");const{controlId:O}=v.useContext(D),N=v.useMemo(()=>({controlId:t||O}),[O,t]),F=!k&&A!=null&&A!==!1||ja(k,Kt),_=g.jsx(bn,{...w,type:y==="switch"?"checkbox":y,ref:C,isValid:o,isInvalid:s,disabled:i,as:x});return g.jsx(D.Provider,{value:N,children:g.jsx("div",{style:m,className:P(u,F&&e,a&&`${e}-inline`,r&&`${e}-reverse`,y==="switch"&&n),children:k||g.jsxs(g.Fragment,{children:[_,F&&g.jsx(Kt,{title:b,children:A}),l&&g.jsx(mn,{type:c,tooltip:f,children:l})]})})})});hn.displayName="FormCheck";const It=Object.assign(hn,{Input:bn,Label:Kt}),yn=v.forwardRef(({bsPrefix:t,type:e,size:n,htmlSize:a,id:r,className:i,isValid:o=!1,isInvalid:s=!1,plaintext:f,readOnly:l,as:c="input",...u},m)=>{const{controlId:b}=v.useContext(D);t=j(t,"form-control");let y;return f?y={[`${t}-plaintext`]:!0}:y={[t]:!0,[`${t}-${n}`]:n},g.jsx(c,{...u,type:e,size:a,ref:m,readOnly:l,id:r||b,className:P(i,y,o&&"is-valid",s&&"is-invalid",e==="color"&&`${t}-color`)})});yn.displayName="FormControl";const _a=Object.assign(yn,{Feedback:mn});var Ra=/-(.)/g;function La(t){return t.replace(Ra,function(e,n){return n.toUpperCase()})}const $a=t=>t[0].toUpperCase()+La(t).slice(1);function me(t,{displayName:e=$a(t),Component:n,defaultProps:a}={}){const r=v.forwardRef(({className:i,bsPrefix:o,as:s=n||"div",...f},l)=>{const c={...a,...f},u=j(o,t);return g.jsx(s,{ref:l,className:P(i,u),...c})});return r.displayName=e,r}const Da=me("form-floating"),wn=v.forwardRef(({controlId:t,as:e="div",...n},a)=>{const r=v.useMemo(()=>({controlId:t}),[t]);return g.jsx(D.Provider,{value:r,children:g.jsx(e,{...n,ref:a})})});wn.displayName="FormGroup";const xn=wn;function Ma({as:t,bsPrefix:e,className:n,...a}){e=j(e,"col");const r=dn(),i=vn(),o=[],s=[];return r.forEach(f=>{const l=a[f];delete a[f];let c,u,m;typeof l=="object"&&l!=null?{span:c,offset:u,order:m}=l:c=l;const b=f!==i?`-${f}`:"";c&&o.push(c===!0?`${e}${b}`:`${e}${b}-${c}`),m!=null&&s.push(`order${b}-${m}`),u!=null&&s.push(`offset${b}-${u}`)}),[{...a,className:P(n,...o,...s)},{as:t,bsPrefix:e,spans:o}]}const kn=v.forwardRef((t,e)=>{const[{className:n,...a},{as:r="div",bsPrefix:i,spans:o}]=Ma(t);return g.jsx(r,{...a,ref:e,className:P(n,!o.length&&i)})});kn.displayName="Col";const An=kn,Cn=v.forwardRef(({as:t="label",bsPrefix:e,column:n=!1,visuallyHidden:a=!1,className:r,htmlFor:i,...o},s)=>{const{controlId:f}=v.useContext(D);e=j(e,"form-label");let l="col-form-label";typeof n=="string"&&(l=`${l} ${l}-${n}`);const c=P(r,e,a&&"visually-hidden",n&&l);return i=i||f,n?g.jsx(An,{ref:s,as:"label",className:c,htmlFor:i,...o}):g.jsx(t,{ref:s,className:c,htmlFor:i,...o})});Cn.displayName="FormLabel";const za=Cn,On=v.forwardRef(({bsPrefix:t,className:e,id:n,...a},r)=>{const{controlId:i}=v.useContext(D);return t=j(t,"form-range"),g.jsx("input",{...a,type:"range",ref:r,className:P(e,t),id:n||i})});On.displayName="FormRange";const Ya=On,Sn=v.forwardRef(({bsPrefix:t,size:e,htmlSize:n,className:a,isValid:r=!1,isInvalid:i=!1,id:o,...s},f)=>{const{controlId:l}=v.useContext(D);return t=j(t,"form-select"),g.jsx("select",{...s,size:n,ref:f,className:P(a,t,e&&`${t}-${e}`,r&&"is-valid",i&&"is-invalid"),id:o||l})});Sn.displayName="FormSelect";const Ua=Sn,En=v.forwardRef(({bsPrefix:t,className:e,as:n="small",muted:a,...r},i)=>(t=j(t,"form-text"),g.jsx(n,{...r,ref:i,className:P(e,t,a&&"text-muted")})));En.displayName="FormText";const Wa=En,Nn=v.forwardRef((t,e)=>g.jsx(It,{...t,ref:e,type:"switch"}));Nn.displayName="Switch";const Ba=Object.assign(Nn,{Input:It.Input,Label:It.Label}),Tn=v.forwardRef(({bsPrefix:t,className:e,children:n,controlId:a,label:r,...i},o)=>(t=j(t,"form-floating"),g.jsxs(xn,{ref:o,className:P(e,t),controlId:a,...i,children:[n,g.jsx("label",{htmlFor:a,children:r})]})));Tn.displayName="FloatingLabel";const Ha=Tn,Ga={_ref:h.any,validated:h.bool,as:h.elementType},de=v.forwardRef(({className:t,validated:e,as:n="form",...a},r)=>g.jsx(n,{...a,ref:r,className:P(t,e&&"was-validated")}));de.displayName="Form";de.propTypes=Ga;const gt=Object.assign(de,{Group:xn,Control:_a,Floating:Da,Check:It,Switch:Ba,Label:za,Text:Wa,Range:Ya,Select:Ua,FloatingLabel:Ha}),Pn=v.forwardRef(({bsPrefix:t,className:e,as:n="div",...a},r)=>{const i=j(t,"row"),o=dn(),s=vn(),f=`${i}-cols`,l=[];return o.forEach(c=>{const u=a[c];delete a[c];let m;u!=null&&typeof u=="object"?{cols:m}=u:m=u;const b=c!==s?`-${c}`:"";m!=null&&l.push(`${f}${b}-${m}`)}),g.jsx(n,{ref:r,...a,className:P(e,i,...l)})});Pn.displayName="Row";const Ka=Pn,Va=["as","disabled"];function Xa(t,e){if(t==null)return{};var n={},a=Object.keys(t),r,i;for(i=0;i<a.length;i++)r=a[i],!(e.indexOf(r)>=0)&&(n[r]=t[r]);return n}function qa(t){return!t||t.trim()==="#"}function ve({tagName:t,disabled:e,href:n,target:a,rel:r,role:i,onClick:o,tabIndex:s=0,type:f}){t||(n!=null||a!=null||r!=null?t="a":t="button");const l={tagName:t};if(t==="button")return[{type:f||"button",disabled:e},l];const c=m=>{if((e||t==="a"&&qa(n))&&m.preventDefault(),e){m.stopPropagation();return}o==null||o(m)},u=m=>{m.key===" "&&(m.preventDefault(),c(m))};return t==="a"&&(n||(n="#"),e&&(n=void 0)),[{role:i??"button",disabled:void 0,tabIndex:e?void 0:s,href:n,target:t==="a"?a:void 0,"aria-disabled":e||void 0,rel:t==="a"?r:void 0,onClick:c,onKeyDown:u},l]}const Qa=v.forwardRef((t,e)=>{let{as:n,disabled:a}=t,r=Xa(t,Va);const[i,{tagName:o}]=ve(Object.assign({tagName:n,disabled:a},r));return g.jsx(o,Object.assign({},r,i,{ref:e}))});Qa.displayName="Button";const In=v.forwardRef(({as:t,bsPrefix:e,variant:n="primary",size:a,active:r=!1,disabled:i=!1,className:o,...s},f)=>{const l=j(e,"btn"),[c,{tagName:u}]=ve({tagName:t,disabled:i,...s}),m=u;return g.jsx(m,{...c,...s,ref:f,disabled:i,className:P(o,l,r&&"active",n&&`${l}-${n}`,a&&`${l}-${a}`,s.href&&i&&"disabled")})});In.displayName="Button";const Za=In;function Te(t){return"default"+t.charAt(0).toUpperCase()+t.substr(1)}function Ja(t){var e=tr(t,"string");return typeof e=="symbol"?e:String(e)}function tr(t,e){if(typeof t!="object"||t===null)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var a=n.call(t,e||"default");if(typeof a!="object")return a;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function er(t,e,n){var a=v.useRef(t!==void 0),r=v.useState(e),i=r[0],o=r[1],s=t!==void 0,f=a.current;return a.current=s,!s&&f&&i!==e&&o(e),[s?t:i,v.useCallback(function(l){for(var c=arguments.length,u=new Array(c>1?c-1:0),m=1;m<c;m++)u[m-1]=arguments[m];n&&n.apply(void 0,[l].concat(u)),o(l)},[n])]}function nr(t,e){return Object.keys(e).reduce(function(n,a){var r,i=n,o=i[Te(a)],s=i[a],f=ba(i,[Te(a),a].map(Ja)),l=e[a],c=er(s,o,t[l]),u=c[0],m=c[1];return ga({},f,(r={},r[a]=u,r[l]=m,r))},t)}function ar(t){var e=v.useRef(t);return v.useEffect(function(){e.current=t},[t]),e}function Fn(t){var e=ar(t);return v.useCallback(function(){return e.current&&e.current.apply(e,arguments)},[e])}const rr=["onKeyDown"];function ir(t,e){if(t==null)return{};var n={},a=Object.keys(t),r,i;for(i=0;i<a.length;i++)r=a[i],!(e.indexOf(r)>=0)&&(n[r]=t[r]);return n}function or(t){return!t||t.trim()==="#"}const jn=v.forwardRef((t,e)=>{let{onKeyDown:n}=t,a=ir(t,rr);const[r]=ve(Object.assign({tagName:"a"},a)),i=Fn(o=>{r.onKeyDown(o),n==null||n(o)});return or(a.href)||a.role==="button"?g.jsx("a",Object.assign({ref:e},a,r,{onKeyDown:i})):g.jsx("a",Object.assign({ref:e},a,{onKeyDown:n}))});jn.displayName="Anchor";const sr=jn;function fr(t){return t&&t.ownerDocument||document}function lr(t){var e=fr(t);return e&&e.defaultView||window}function cr(t,e){return lr(t).getComputedStyle(t,e)}var ur=/([A-Z])/g;function mr(t){return t.replace(ur,"-$1").toLowerCase()}var dr=/^ms-/;function ht(t){return mr(t).replace(dr,"-ms-")}var vr=/^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i;function pr(t){return!!(t&&vr.test(t))}function _n(t,e){var n="",a="";if(typeof e=="string")return t.style.getPropertyValue(ht(e))||cr(t).getPropertyValue(ht(e));Object.keys(e).forEach(function(r){var i=e[r];!i&&i!==0?t.style.removeProperty(ht(r)):pr(r)?a+=r+"("+i+") ":n+=ht(r)+": "+i+";"}),a&&(n+="transform: "+a+";"),t.style.cssText+=";"+n}const br=!!(typeof window<"u"&&window.document&&window.document.createElement);var Vt=!1,Xt=!1;try{var Yt={get passive(){return Vt=!0},get once(){return Xt=Vt=!0}};br&&(window.addEventListener("test",Yt,Yt),window.removeEventListener("test",Yt,!0))}catch{}function gr(t,e,n,a){if(a&&typeof a!="boolean"&&!Xt){var r=a.once,i=a.capture,o=n;!Xt&&r&&(o=n.__once||function s(f){this.removeEventListener(e,s,i),n.call(this,f)},n.__once=o),t.addEventListener(e,o,Vt?a:i)}t.addEventListener(e,n,a)}function hr(t,e,n,a){var r=a&&typeof a!="boolean"?a.capture:a;t.removeEventListener(e,n,r),n.__once&&t.removeEventListener(e,n.__once,r)}function Rn(t,e,n,a){return gr(t,e,n,a),function(){hr(t,e,n,a)}}function yr(t,e,n,a){if(n===void 0&&(n=!1),a===void 0&&(a=!0),t){var r=document.createEvent("HTMLEvents");r.initEvent(e,n,a),t.dispatchEvent(r)}}function wr(t){var e=_n(t,"transitionDuration")||"",n=e.indexOf("ms")===-1?1e3:1;return parseFloat(e)*n}function xr(t,e,n){n===void 0&&(n=5);var a=!1,r=setTimeout(function(){a||yr(t,"transitionend",!0)},e+n),i=Rn(t,"transitionend",function(){a=!0},{once:!0});return function(){clearTimeout(r),i()}}function kr(t,e,n,a){n==null&&(n=wr(t)||0);var r=xr(t,n,a),i=Rn(t,"transitionend",e);return function(){r(),i()}}function Pe(t,e){const n=_n(t,e)||"",a=n.indexOf("ms")===-1?1e3:1;return parseFloat(n)*a}function Ar(t,e){const n=Pe(t,"transitionDuration"),a=Pe(t,"transitionDelay"),r=kr(t,i=>{i.target===t&&(r(),e(i))},n+a)}function Cr(t){t.offsetHeight}var Ie=function(e){return!e||typeof e=="function"?e:function(n){e.current=n}};function Or(t,e){var n=Ie(t),a=Ie(e);return function(r){n&&n(r),a&&a(r)}}function Sr(t,e){return v.useMemo(function(){return Or(t,e)},[t,e])}function Er(t){return t&&"setState"in t?ha.findDOMNode(t):t??null}const Nr=Pt.forwardRef(({onEnter:t,onEntering:e,onEntered:n,onExit:a,onExiting:r,onExited:i,addEndListener:o,children:s,childRef:f,...l},c)=>{const u=v.useRef(null),m=Sr(u,f),b=F=>{m(Er(F))},y=F=>_=>{F&&u.current&&F(u.current,_)},A=v.useCallback(y(t),[t]),k=v.useCallback(y(e),[e]),x=v.useCallback(y(n),[n]),w=v.useCallback(y(a),[a]),C=v.useCallback(y(r),[r]),O=v.useCallback(y(i),[i]),N=v.useCallback(y(o),[o]);return g.jsx(ya,{ref:c,...l,onEnter:A,onEntered:x,onEntering:k,onExit:w,onExited:O,onExiting:C,addEndListener:N,nodeRef:u,children:typeof s=="function"?(F,_)=>s(F,{..._,ref:b}):Pt.cloneElement(s,{ref:b})})}),Tr=Nr,Pr={[wa]:"show",[xa]:"show"},Ln=v.forwardRef(({className:t,children:e,transitionClasses:n={},onEnter:a,...r},i)=>{const o={in:!1,timeout:300,mountOnEnter:!1,unmountOnExit:!1,appear:!1,...r},s=v.useCallback((f,l)=>{Cr(f),a==null||a(f,l)},[a]);return g.jsx(Tr,{ref:i,addEndListener:Ar,...o,onEnter:s,childRef:e.ref,children:(f,l)=>v.cloneElement(e,{...l,className:P("fade",t,e.props.className,Pr[f],n[f])})})});Ln.displayName="Fade";const Fe=Ln,Ir={"aria-label":h.string,onClick:h.func,variant:h.oneOf(["white"])},pe=v.forwardRef(({className:t,variant:e,"aria-label":n="Close",...a},r)=>g.jsx("button",{ref:r,type:"button",className:P("btn-close",e&&`btn-close-${e}`,t),"aria-label":n,...a}));pe.displayName="CloseButton";pe.propTypes=Ir;const Fr=pe,jr=t=>v.forwardRef((e,n)=>g.jsx("div",{...e,ref:n,className:P(e.className,t)})),$n=jr("h4");$n.displayName="DivStyledAsH4";const _r=me("alert-heading",{Component:$n}),Rr=me("alert-link",{Component:sr}),Dn=v.forwardRef((t,e)=>{const{bsPrefix:n,show:a=!0,closeLabel:r="Close alert",closeVariant:i,className:o,children:s,variant:f="primary",onClose:l,dismissible:c,transition:u=Fe,...m}=nr(t,{show:"onClose"}),b=j(n,"alert"),y=Fn(x=>{l&&l(!1,x)}),A=u===!0?Fe:u,k=g.jsxs("div",{role:"alert",...A?void 0:m,ref:e,className:P(o,b,f&&`${b}-${f}`,c&&`${b}-dismissible`),children:[c&&g.jsx(Fr,{onClick:y,"aria-label":r,variant:i}),s]});return A?g.jsx(A,{unmountOnExit:!0,...m,ref:void 0,in:a,children:k}):a?k:null});Dn.displayName="Alert";const Lr=Object.assign(Dn,{Link:Rr,Heading:_r});function je(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);e&&(a=a.filter(function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable})),n.push.apply(n,a)}return n}function d(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?je(Object(n),!0).forEach(function(a){I(t,a,n[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):je(Object(n)).forEach(function(a){Object.defineProperty(t,a,Object.getOwnPropertyDescriptor(n,a))})}return t}function Ft(t){"@babel/helpers - typeof";return Ft=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},Ft(t)}function $r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function _e(t,e){for(var n=0;n<e.length;n++){var a=e[n];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(t,a.key,a)}}function Dr(t,e,n){return e&&_e(t.prototype,e),n&&_e(t,n),Object.defineProperty(t,"prototype",{writable:!1}),t}function I(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function be(t,e){return zr(t)||Ur(t,e)||Mn(t,e)||Br()}function dt(t){return Mr(t)||Yr(t)||Mn(t)||Wr()}function Mr(t){if(Array.isArray(t))return qt(t)}function zr(t){if(Array.isArray(t))return t}function Yr(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function Ur(t,e){var n=t==null?null:typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(n!=null){var a=[],r=!0,i=!1,o,s;try{for(n=n.call(t);!(r=(o=n.next()).done)&&(a.push(o.value),!(e&&a.length===e));r=!0);}catch(f){i=!0,s=f}finally{try{!r&&n.return!=null&&n.return()}finally{if(i)throw s}}return a}}function Mn(t,e){if(t){if(typeof t=="string")return qt(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);if(n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set")return Array.from(t);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return qt(t,e)}}function qt(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,a=new Array(e);n<e;n++)a[n]=t[n];return a}function Wr(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Br(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var Re=function(){},ge={},zn={},Yn=null,Un={mark:Re,measure:Re};try{typeof window<"u"&&(ge=window),typeof document<"u"&&(zn=document),typeof MutationObserver<"u"&&(Yn=MutationObserver),typeof performance<"u"&&(Un=performance)}catch{}var Hr=ge.navigator||{},Le=Hr.userAgent,$e=Le===void 0?"":Le,G=ge,E=zn,De=Yn,yt=Un;G.document;var U=!!E.documentElement&&!!E.head&&typeof E.addEventListener=="function"&&typeof E.createElement=="function",Wn=~$e.indexOf("MSIE")||~$e.indexOf("Trident/"),wt,xt,kt,At,Ct,M="___FONT_AWESOME___",Qt=16,Bn="fa",Hn="svg-inline--fa",Q="data-fa-i2svg",Zt="data-fa-pseudo-element",Gr="data-fa-pseudo-element-pending",he="data-prefix",ye="data-icon",Me="fontawesome-i2svg",Kr="async",Vr=["HTML","HEAD","STYLE","SCRIPT"],Gn=function(){try{return!0}catch{return!1}}(),S="classic",T="sharp",we=[S,T];function vt(t){return new Proxy(t,{get:function(n,a){return a in n?n[a]:n[S]}})}var ft=vt((wt={},I(wt,S,{fa:"solid",fas:"solid","fa-solid":"solid",far:"regular","fa-regular":"regular",fal:"light","fa-light":"light",fat:"thin","fa-thin":"thin",fad:"duotone","fa-duotone":"duotone",fab:"brands","fa-brands":"brands",fak:"kit","fa-kit":"kit"}),I(wt,T,{fa:"solid",fass:"solid","fa-solid":"solid",fasr:"regular","fa-regular":"regular",fasl:"light","fa-light":"light"}),wt)),lt=vt((xt={},I(xt,S,{solid:"fas",regular:"far",light:"fal",thin:"fat",duotone:"fad",brands:"fab",kit:"fak"}),I(xt,T,{solid:"fass",regular:"fasr",light:"fasl"}),xt)),ct=vt((kt={},I(kt,S,{fab:"fa-brands",fad:"fa-duotone",fak:"fa-kit",fal:"fa-light",far:"fa-regular",fas:"fa-solid",fat:"fa-thin"}),I(kt,T,{fass:"fa-solid",fasr:"fa-regular",fasl:"fa-light"}),kt)),Xr=vt((At={},I(At,S,{"fa-brands":"fab","fa-duotone":"fad","fa-kit":"fak","fa-light":"fal","fa-regular":"far","fa-solid":"fas","fa-thin":"fat"}),I(At,T,{"fa-solid":"fass","fa-regular":"fasr","fa-light":"fasl"}),At)),qr=/fa(s|r|l|t|d|b|k|ss|sr|sl)?[\-\ ]/,Kn="fa-layers-text",Qr=/Font ?Awesome ?([56 ]*)(Solid|Regular|Light|Thin|Duotone|Brands|Free|Pro|Sharp|Kit)?.*/i,Zr=vt((Ct={},I(Ct,S,{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"}),I(Ct,T,{900:"fass",400:"fasr",300:"fasl"}),Ct)),Vn=[1,2,3,4,5,6,7,8,9,10],Jr=Vn.concat([11,12,13,14,15,16,17,18,19,20]),ti=["class","data-prefix","data-icon","data-fa-transform","data-fa-mask"],X={GROUP:"duotone-group",SWAP_OPACITY:"swap-opacity",PRIMARY:"primary",SECONDARY:"secondary"},ut=new Set;Object.keys(lt[S]).map(ut.add.bind(ut));Object.keys(lt[T]).map(ut.add.bind(ut));var ei=[].concat(we,dt(ut),["2xs","xs","sm","lg","xl","2xl","beat","border","fade","beat-fade","bounce","flip-both","flip-horizontal","flip-vertical","flip","fw","inverse","layers-counter","layers-text","layers","li","pull-left","pull-right","pulse","rotate-180","rotate-270","rotate-90","rotate-by","shake","spin-pulse","spin-reverse","spin","stack-1x","stack-2x","stack","ul",X.GROUP,X.SWAP_OPACITY,X.PRIMARY,X.SECONDARY]).concat(Vn.map(function(t){return"".concat(t,"x")})).concat(Jr.map(function(t){return"w-".concat(t)})),ot=G.FontAwesomeConfig||{};function ni(t){var e=E.querySelector("script["+t+"]");if(e)return e.getAttribute(t)}function ai(t){return t===""?!0:t==="false"?!1:t==="true"?!0:t}if(E&&typeof E.querySelector=="function"){var ri=[["data-family-prefix","familyPrefix"],["data-css-prefix","cssPrefix"],["data-family-default","familyDefault"],["data-style-default","styleDefault"],["data-replacement-class","replacementClass"],["data-auto-replace-svg","autoReplaceSvg"],["data-auto-add-css","autoAddCss"],["data-auto-a11y","autoA11y"],["data-search-pseudo-elements","searchPseudoElements"],["data-observe-mutations","observeMutations"],["data-mutate-approach","mutateApproach"],["data-keep-original-source","keepOriginalSource"],["data-measure-performance","measurePerformance"],["data-show-missing-icons","showMissingIcons"]];ri.forEach(function(t){var e=be(t,2),n=e[0],a=e[1],r=ai(ni(n));r!=null&&(ot[a]=r)})}var Xn={styleDefault:"solid",familyDefault:"classic",cssPrefix:Bn,replacementClass:Hn,autoReplaceSvg:!0,autoAddCss:!0,autoA11y:!0,searchPseudoElements:!1,observeMutations:!0,mutateApproach:"async",keepOriginalSource:!0,measurePerformance:!1,showMissingIcons:!0};ot.familyPrefix&&(ot.cssPrefix=ot.familyPrefix);var at=d(d({},Xn),ot);at.autoReplaceSvg||(at.observeMutations=!1);var p={};Object.keys(Xn).forEach(function(t){Object.defineProperty(p,t,{enumerable:!0,set:function(n){at[t]=n,st.forEach(function(a){return a(p)})},get:function(){return at[t]}})});Object.defineProperty(p,"familyPrefix",{enumerable:!0,set:function(e){at.cssPrefix=e,st.forEach(function(n){return n(p)})},get:function(){return at.cssPrefix}});G.FontAwesomeConfig=p;var st=[];function ii(t){return st.push(t),function(){st.splice(st.indexOf(t),1)}}var B=Qt,$={size:16,x:0,y:0,rotate:0,flipX:!1,flipY:!1};function oi(t){if(!(!t||!U)){var e=E.createElement("style");e.setAttribute("type","text/css"),e.innerHTML=t;for(var n=E.head.childNodes,a=null,r=n.length-1;r>-1;r--){var i=n[r],o=(i.tagName||"").toUpperCase();["STYLE","LINK"].indexOf(o)>-1&&(a=i)}return E.head.insertBefore(e,a),t}}var si="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";function mt(){for(var t=12,e="";t-- >0;)e+=si[Math.random()*62|0];return e}function rt(t){for(var e=[],n=(t||[]).length>>>0;n--;)e[n]=t[n];return e}function xe(t){return t.classList?rt(t.classList):(t.getAttribute("class")||"").split(" ").filter(function(e){return e})}function qn(t){return"".concat(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function fi(t){return Object.keys(t||{}).reduce(function(e,n){return e+"".concat(n,'="').concat(qn(t[n]),'" ')},"").trim()}function Lt(t){return Object.keys(t||{}).reduce(function(e,n){return e+"".concat(n,": ").concat(t[n].trim(),";")},"")}function ke(t){return t.size!==$.size||t.x!==$.x||t.y!==$.y||t.rotate!==$.rotate||t.flipX||t.flipY}function li(t){var e=t.transform,n=t.containerWidth,a=t.iconWidth,r={transform:"translate(".concat(n/2," 256)")},i="translate(".concat(e.x*32,", ").concat(e.y*32,") "),o="scale(".concat(e.size/16*(e.flipX?-1:1),", ").concat(e.size/16*(e.flipY?-1:1),") "),s="rotate(".concat(e.rotate," 0 0)"),f={transform:"".concat(i," ").concat(o," ").concat(s)},l={transform:"translate(".concat(a/2*-1," -256)")};return{outer:r,inner:f,path:l}}function ci(t){var e=t.transform,n=t.width,a=n===void 0?Qt:n,r=t.height,i=r===void 0?Qt:r,o=t.startCentered,s=o===void 0?!1:o,f="";return s&&Wn?f+="translate(".concat(e.x/B-a/2,"em, ").concat(e.y/B-i/2,"em) "):s?f+="translate(calc(-50% + ".concat(e.x/B,"em), calc(-50% + ").concat(e.y/B,"em)) "):f+="translate(".concat(e.x/B,"em, ").concat(e.y/B,"em) "),f+="scale(".concat(e.size/B*(e.flipX?-1:1),", ").concat(e.size/B*(e.flipY?-1:1),") "),f+="rotate(".concat(e.rotate,"deg) "),f}var ui=`:root, :host {
  --fa-font-solid: normal 900 1em/1 "Font Awesome 6 Solid";
  --fa-font-regular: normal 400 1em/1 "Font Awesome 6 Regular";
  --fa-font-light: normal 300 1em/1 "Font Awesome 6 Light";
  --fa-font-thin: normal 100 1em/1 "Font Awesome 6 Thin";
  --fa-font-duotone: normal 900 1em/1 "Font Awesome 6 Duotone";
  --fa-font-sharp-solid: normal 900 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-regular: normal 400 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-light: normal 300 1em/1 "Font Awesome 6 Sharp";
  --fa-font-brands: normal 400 1em/1 "Font Awesome 6 Brands";
}

svg:not(:root).svg-inline--fa, svg:not(:host).svg-inline--fa {
  overflow: visible;
  box-sizing: content-box;
}

.svg-inline--fa {
  display: var(--fa-display, inline-block);
  height: 1em;
  overflow: visible;
  vertical-align: -0.125em;
}
.svg-inline--fa.fa-2xs {
  vertical-align: 0.1em;
}
.svg-inline--fa.fa-xs {
  vertical-align: 0em;
}
.svg-inline--fa.fa-sm {
  vertical-align: -0.0714285705em;
}
.svg-inline--fa.fa-lg {
  vertical-align: -0.2em;
}
.svg-inline--fa.fa-xl {
  vertical-align: -0.25em;
}
.svg-inline--fa.fa-2xl {
  vertical-align: -0.3125em;
}
.svg-inline--fa.fa-pull-left {
  margin-right: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-pull-right {
  margin-left: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-li {
  width: var(--fa-li-width, 2em);
  top: 0.25em;
}
.svg-inline--fa.fa-fw {
  width: var(--fa-fw-width, 1.25em);
}

.fa-layers svg.svg-inline--fa {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
}

.fa-layers-counter, .fa-layers-text {
  display: inline-block;
  position: absolute;
  text-align: center;
}

.fa-layers {
  display: inline-block;
  height: 1em;
  position: relative;
  text-align: center;
  vertical-align: -0.125em;
  width: 1em;
}
.fa-layers svg.svg-inline--fa {
  -webkit-transform-origin: center center;
          transform-origin: center center;
}

.fa-layers-text {
  left: 50%;
  top: 50%;
  -webkit-transform: translate(-50%, -50%);
          transform: translate(-50%, -50%);
  -webkit-transform-origin: center center;
          transform-origin: center center;
}

.fa-layers-counter {
  background-color: var(--fa-counter-background-color, #ff253a);
  border-radius: var(--fa-counter-border-radius, 1em);
  box-sizing: border-box;
  color: var(--fa-inverse, #fff);
  line-height: var(--fa-counter-line-height, 1);
  max-width: var(--fa-counter-max-width, 5em);
  min-width: var(--fa-counter-min-width, 1.5em);
  overflow: hidden;
  padding: var(--fa-counter-padding, 0.25em 0.5em);
  right: var(--fa-right, 0);
  text-overflow: ellipsis;
  top: var(--fa-top, 0);
  -webkit-transform: scale(var(--fa-counter-scale, 0.25));
          transform: scale(var(--fa-counter-scale, 0.25));
  -webkit-transform-origin: top right;
          transform-origin: top right;
}

.fa-layers-bottom-right {
  bottom: var(--fa-bottom, 0);
  right: var(--fa-right, 0);
  top: auto;
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: bottom right;
          transform-origin: bottom right;
}

.fa-layers-bottom-left {
  bottom: var(--fa-bottom, 0);
  left: var(--fa-left, 0);
  right: auto;
  top: auto;
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: bottom left;
          transform-origin: bottom left;
}

.fa-layers-top-right {
  top: var(--fa-top, 0);
  right: var(--fa-right, 0);
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: top right;
          transform-origin: top right;
}

.fa-layers-top-left {
  left: var(--fa-left, 0);
  right: auto;
  top: var(--fa-top, 0);
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: top left;
          transform-origin: top left;
}

.fa-1x {
  font-size: 1em;
}

.fa-2x {
  font-size: 2em;
}

.fa-3x {
  font-size: 3em;
}

.fa-4x {
  font-size: 4em;
}

.fa-5x {
  font-size: 5em;
}

.fa-6x {
  font-size: 6em;
}

.fa-7x {
  font-size: 7em;
}

.fa-8x {
  font-size: 8em;
}

.fa-9x {
  font-size: 9em;
}

.fa-10x {
  font-size: 10em;
}

.fa-2xs {
  font-size: 0.625em;
  line-height: 0.1em;
  vertical-align: 0.225em;
}

.fa-xs {
  font-size: 0.75em;
  line-height: 0.0833333337em;
  vertical-align: 0.125em;
}

.fa-sm {
  font-size: 0.875em;
  line-height: 0.0714285718em;
  vertical-align: 0.0535714295em;
}

.fa-lg {
  font-size: 1.25em;
  line-height: 0.05em;
  vertical-align: -0.075em;
}

.fa-xl {
  font-size: 1.5em;
  line-height: 0.0416666682em;
  vertical-align: -0.125em;
}

.fa-2xl {
  font-size: 2em;
  line-height: 0.03125em;
  vertical-align: -0.1875em;
}

.fa-fw {
  text-align: center;
  width: 1.25em;
}

.fa-ul {
  list-style-type: none;
  margin-left: var(--fa-li-margin, 2.5em);
  padding-left: 0;
}
.fa-ul > li {
  position: relative;
}

.fa-li {
  left: calc(var(--fa-li-width, 2em) * -1);
  position: absolute;
  text-align: center;
  width: var(--fa-li-width, 2em);
  line-height: inherit;
}

.fa-border {
  border-color: var(--fa-border-color, #eee);
  border-radius: var(--fa-border-radius, 0.1em);
  border-style: var(--fa-border-style, solid);
  border-width: var(--fa-border-width, 0.08em);
  padding: var(--fa-border-padding, 0.2em 0.25em 0.15em);
}

.fa-pull-left {
  float: left;
  margin-right: var(--fa-pull-margin, 0.3em);
}

.fa-pull-right {
  float: right;
  margin-left: var(--fa-pull-margin, 0.3em);
}

.fa-beat {
  -webkit-animation-name: fa-beat;
          animation-name: fa-beat;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, ease-in-out);
          animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-bounce {
  -webkit-animation-name: fa-bounce;
          animation-name: fa-bounce;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
          animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
}

.fa-fade {
  -webkit-animation-name: fa-fade;
          animation-name: fa-fade;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
          animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-beat-fade {
  -webkit-animation-name: fa-beat-fade;
          animation-name: fa-beat-fade;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
          animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-flip {
  -webkit-animation-name: fa-flip;
          animation-name: fa-flip;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, ease-in-out);
          animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-shake {
  -webkit-animation-name: fa-shake;
          animation-name: fa-shake;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, linear);
          animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin {
  -webkit-animation-name: fa-spin;
          animation-name: fa-spin;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 2s);
          animation-duration: var(--fa-animation-duration, 2s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, linear);
          animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-reverse {
  --fa-animation-direction: reverse;
}

.fa-pulse,
.fa-spin-pulse {
  -webkit-animation-name: fa-spin;
          animation-name: fa-spin;
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, steps(8));
          animation-timing-function: var(--fa-animation-timing, steps(8));
}

@media (prefers-reduced-motion: reduce) {
  .fa-beat,
.fa-bounce,
.fa-fade,
.fa-beat-fade,
.fa-flip,
.fa-pulse,
.fa-shake,
.fa-spin,
.fa-spin-pulse {
    -webkit-animation-delay: -1ms;
            animation-delay: -1ms;
    -webkit-animation-duration: 1ms;
            animation-duration: 1ms;
    -webkit-animation-iteration-count: 1;
            animation-iteration-count: 1;
    -webkit-transition-delay: 0s;
            transition-delay: 0s;
    -webkit-transition-duration: 0s;
            transition-duration: 0s;
  }
}
@-webkit-keyframes fa-beat {
  0%, 90% {
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  45% {
    -webkit-transform: scale(var(--fa-beat-scale, 1.25));
            transform: scale(var(--fa-beat-scale, 1.25));
  }
}
@keyframes fa-beat {
  0%, 90% {
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  45% {
    -webkit-transform: scale(var(--fa-beat-scale, 1.25));
            transform: scale(var(--fa-beat-scale, 1.25));
  }
}
@-webkit-keyframes fa-bounce {
  0% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  10% {
    -webkit-transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
            transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
  }
  30% {
    -webkit-transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
            transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
  }
  50% {
    -webkit-transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
            transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
  }
  57% {
    -webkit-transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
            transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
  }
  64% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  100% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
}
@keyframes fa-bounce {
  0% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  10% {
    -webkit-transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
            transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
  }
  30% {
    -webkit-transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
            transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
  }
  50% {
    -webkit-transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
            transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
  }
  57% {
    -webkit-transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
            transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
  }
  64% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  100% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
}
@-webkit-keyframes fa-fade {
  50% {
    opacity: var(--fa-fade-opacity, 0.4);
  }
}
@keyframes fa-fade {
  50% {
    opacity: var(--fa-fade-opacity, 0.4);
  }
}
@-webkit-keyframes fa-beat-fade {
  0%, 100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  50% {
    opacity: 1;
    -webkit-transform: scale(var(--fa-beat-fade-scale, 1.125));
            transform: scale(var(--fa-beat-fade-scale, 1.125));
  }
}
@keyframes fa-beat-fade {
  0%, 100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  50% {
    opacity: 1;
    -webkit-transform: scale(var(--fa-beat-fade-scale, 1.125));
            transform: scale(var(--fa-beat-fade-scale, 1.125));
  }
}
@-webkit-keyframes fa-flip {
  50% {
    -webkit-transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
            transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
  }
}
@keyframes fa-flip {
  50% {
    -webkit-transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
            transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
  }
}
@-webkit-keyframes fa-shake {
  0% {
    -webkit-transform: rotate(-15deg);
            transform: rotate(-15deg);
  }
  4% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  8%, 24% {
    -webkit-transform: rotate(-18deg);
            transform: rotate(-18deg);
  }
  12%, 28% {
    -webkit-transform: rotate(18deg);
            transform: rotate(18deg);
  }
  16% {
    -webkit-transform: rotate(-22deg);
            transform: rotate(-22deg);
  }
  20% {
    -webkit-transform: rotate(22deg);
            transform: rotate(22deg);
  }
  32% {
    -webkit-transform: rotate(-12deg);
            transform: rotate(-12deg);
  }
  36% {
    -webkit-transform: rotate(12deg);
            transform: rotate(12deg);
  }
  40%, 100% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
}
@keyframes fa-shake {
  0% {
    -webkit-transform: rotate(-15deg);
            transform: rotate(-15deg);
  }
  4% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  8%, 24% {
    -webkit-transform: rotate(-18deg);
            transform: rotate(-18deg);
  }
  12%, 28% {
    -webkit-transform: rotate(18deg);
            transform: rotate(18deg);
  }
  16% {
    -webkit-transform: rotate(-22deg);
            transform: rotate(-22deg);
  }
  20% {
    -webkit-transform: rotate(22deg);
            transform: rotate(22deg);
  }
  32% {
    -webkit-transform: rotate(-12deg);
            transform: rotate(-12deg);
  }
  36% {
    -webkit-transform: rotate(12deg);
            transform: rotate(12deg);
  }
  40%, 100% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
}
@-webkit-keyframes fa-spin {
  0% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
            transform: rotate(360deg);
  }
}
@keyframes fa-spin {
  0% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
            transform: rotate(360deg);
  }
}
.fa-rotate-90 {
  -webkit-transform: rotate(90deg);
          transform: rotate(90deg);
}

.fa-rotate-180 {
  -webkit-transform: rotate(180deg);
          transform: rotate(180deg);
}

.fa-rotate-270 {
  -webkit-transform: rotate(270deg);
          transform: rotate(270deg);
}

.fa-flip-horizontal {
  -webkit-transform: scale(-1, 1);
          transform: scale(-1, 1);
}

.fa-flip-vertical {
  -webkit-transform: scale(1, -1);
          transform: scale(1, -1);
}

.fa-flip-both,
.fa-flip-horizontal.fa-flip-vertical {
  -webkit-transform: scale(-1, -1);
          transform: scale(-1, -1);
}

.fa-rotate-by {
  -webkit-transform: rotate(var(--fa-rotate-angle, none));
          transform: rotate(var(--fa-rotate-angle, none));
}

.fa-stack {
  display: inline-block;
  vertical-align: middle;
  height: 2em;
  position: relative;
  width: 2.5em;
}

.fa-stack-1x,
.fa-stack-2x {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  z-index: var(--fa-stack-z-index, auto);
}

.svg-inline--fa.fa-stack-1x {
  height: 1em;
  width: 1.25em;
}
.svg-inline--fa.fa-stack-2x {
  height: 2em;
  width: 2.5em;
}

.fa-inverse {
  color: var(--fa-inverse, #fff);
}

.sr-only,
.fa-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:not(:focus),
.fa-sr-only-focusable:not(:focus) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.svg-inline--fa .fa-primary {
  fill: var(--fa-primary-color, currentColor);
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa .fa-secondary {
  fill: var(--fa-secondary-color, currentColor);
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-primary {
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-secondary {
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa mask .fa-primary,
.svg-inline--fa mask .fa-secondary {
  fill: black;
}

.fad.fa-inverse,
.fa-duotone.fa-inverse {
  color: var(--fa-inverse, #fff);
}`;function Qn(){var t=Bn,e=Hn,n=p.cssPrefix,a=p.replacementClass,r=ui;if(n!==t||a!==e){var i=new RegExp("\\.".concat(t,"\\-"),"g"),o=new RegExp("\\--".concat(t,"\\-"),"g"),s=new RegExp("\\.".concat(e),"g");r=r.replace(i,".".concat(n,"-")).replace(o,"--".concat(n,"-")).replace(s,".".concat(a))}return r}var ze=!1;function Ut(){p.autoAddCss&&!ze&&(oi(Qn()),ze=!0)}var mi={mixout:function(){return{dom:{css:Qn,insertCss:Ut}}},hooks:function(){return{beforeDOMElementCreation:function(){Ut()},beforeI2svg:function(){Ut()}}}},z=G||{};z[M]||(z[M]={});z[M].styles||(z[M].styles={});z[M].hooks||(z[M].hooks={});z[M].shims||(z[M].shims=[]);var L=z[M],Zn=[],di=function t(){E.removeEventListener("DOMContentLoaded",t),jt=1,Zn.map(function(e){return e()})},jt=!1;U&&(jt=(E.documentElement.doScroll?/^loaded|^c/:/^loaded|^i|^c/).test(E.readyState),jt||E.addEventListener("DOMContentLoaded",di));function vi(t){U&&(jt?setTimeout(t,0):Zn.push(t))}function pt(t){var e=t.tag,n=t.attributes,a=n===void 0?{}:n,r=t.children,i=r===void 0?[]:r;return typeof t=="string"?qn(t):"<".concat(e," ").concat(fi(a),">").concat(i.map(pt).join(""),"</").concat(e,">")}function Ye(t,e,n){if(t&&t[e]&&t[e][n])return{prefix:e,iconName:n,icon:t[e][n]}}var pi=function(e,n){return function(a,r,i,o){return e.call(n,a,r,i,o)}},Wt=function(e,n,a,r){var i=Object.keys(e),o=i.length,s=r!==void 0?pi(n,r):n,f,l,c;for(a===void 0?(f=1,c=e[i[0]]):(f=0,c=a);f<o;f++)l=i[f],c=s(c,e[l],l,e);return c};function bi(t){for(var e=[],n=0,a=t.length;n<a;){var r=t.charCodeAt(n++);if(r>=55296&&r<=56319&&n<a){var i=t.charCodeAt(n++);(i&64512)==56320?e.push(((r&1023)<<10)+(i&1023)+65536):(e.push(r),n--)}else e.push(r)}return e}function Jt(t){var e=bi(t);return e.length===1?e[0].toString(16):null}function gi(t,e){var n=t.length,a=t.charCodeAt(e),r;return a>=55296&&a<=56319&&n>e+1&&(r=t.charCodeAt(e+1),r>=56320&&r<=57343)?(a-55296)*1024+r-56320+65536:a}function Ue(t){return Object.keys(t).reduce(function(e,n){var a=t[n],r=!!a.icon;return r?e[a.iconName]=a.icon:e[n]=a,e},{})}function te(t,e){var n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},a=n.skipHooks,r=a===void 0?!1:a,i=Ue(e);typeof L.hooks.addPack=="function"&&!r?L.hooks.addPack(t,Ue(e)):L.styles[t]=d(d({},L.styles[t]||{}),i),t==="fas"&&te("fa",e)}var Ot,St,Et,J=L.styles,hi=L.shims,yi=(Ot={},I(Ot,S,Object.values(ct[S])),I(Ot,T,Object.values(ct[T])),Ot),Ae=null,Jn={},ta={},ea={},na={},aa={},wi=(St={},I(St,S,Object.keys(ft[S])),I(St,T,Object.keys(ft[T])),St);function xi(t){return~ei.indexOf(t)}function ki(t,e){var n=e.split("-"),a=n[0],r=n.slice(1).join("-");return a===t&&r!==""&&!xi(r)?r:null}var ra=function(){var e=function(i){return Wt(J,function(o,s,f){return o[f]=Wt(s,i,{}),o},{})};Jn=e(function(r,i,o){if(i[3]&&(r[i[3]]=o),i[2]){var s=i[2].filter(function(f){return typeof f=="number"});s.forEach(function(f){r[f.toString(16)]=o})}return r}),ta=e(function(r,i,o){if(r[o]=o,i[2]){var s=i[2].filter(function(f){return typeof f=="string"});s.forEach(function(f){r[f]=o})}return r}),aa=e(function(r,i,o){var s=i[2];return r[o]=o,s.forEach(function(f){r[f]=o}),r});var n="far"in J||p.autoFetchSvg,a=Wt(hi,function(r,i){var o=i[0],s=i[1],f=i[2];return s==="far"&&!n&&(s="fas"),typeof o=="string"&&(r.names[o]={prefix:s,iconName:f}),typeof o=="number"&&(r.unicodes[o.toString(16)]={prefix:s,iconName:f}),r},{names:{},unicodes:{}});ea=a.names,na=a.unicodes,Ae=$t(p.styleDefault,{family:p.familyDefault})};ii(function(t){Ae=$t(t.styleDefault,{family:p.familyDefault})});ra();function Ce(t,e){return(Jn[t]||{})[e]}function Ai(t,e){return(ta[t]||{})[e]}function q(t,e){return(aa[t]||{})[e]}function ia(t){return ea[t]||{prefix:null,iconName:null}}function Ci(t){var e=na[t],n=Ce("fas",t);return e||(n?{prefix:"fas",iconName:n}:null)||{prefix:null,iconName:null}}function K(){return Ae}var Oe=function(){return{prefix:null,iconName:null,rest:[]}};function $t(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},n=e.family,a=n===void 0?S:n,r=ft[a][t],i=lt[a][t]||lt[a][r],o=t in L.styles?t:null;return i||o||null}var We=(Et={},I(Et,S,Object.keys(ct[S])),I(Et,T,Object.keys(ct[T])),Et);function Dt(t){var e,n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},a=n.skipLookups,r=a===void 0?!1:a,i=(e={},I(e,S,"".concat(p.cssPrefix,"-").concat(S)),I(e,T,"".concat(p.cssPrefix,"-").concat(T)),e),o=null,s=S;(t.includes(i[S])||t.some(function(l){return We[S].includes(l)}))&&(s=S),(t.includes(i[T])||t.some(function(l){return We[T].includes(l)}))&&(s=T);var f=t.reduce(function(l,c){var u=ki(p.cssPrefix,c);if(J[c]?(c=yi[s].includes(c)?Xr[s][c]:c,o=c,l.prefix=c):wi[s].indexOf(c)>-1?(o=c,l.prefix=$t(c,{family:s})):u?l.iconName=u:c!==p.replacementClass&&c!==i[S]&&c!==i[T]&&l.rest.push(c),!r&&l.prefix&&l.iconName){var m=o==="fa"?ia(l.iconName):{},b=q(l.prefix,l.iconName);m.prefix&&(o=null),l.iconName=m.iconName||b||l.iconName,l.prefix=m.prefix||l.prefix,l.prefix==="far"&&!J.far&&J.fas&&!p.autoFetchSvg&&(l.prefix="fas")}return l},Oe());return(t.includes("fa-brands")||t.includes("fab"))&&(f.prefix="fab"),(t.includes("fa-duotone")||t.includes("fad"))&&(f.prefix="fad"),!f.prefix&&s===T&&(J.fass||p.autoFetchSvg)&&(f.prefix="fass",f.iconName=q(f.prefix,f.iconName)||f.iconName),(f.prefix==="fa"||o==="fa")&&(f.prefix=K()||"fas"),f}var Oi=function(){function t(){$r(this,t),this.definitions={}}return Dr(t,[{key:"add",value:function(){for(var n=this,a=arguments.length,r=new Array(a),i=0;i<a;i++)r[i]=arguments[i];var o=r.reduce(this._pullDefinitions,{});Object.keys(o).forEach(function(s){n.definitions[s]=d(d({},n.definitions[s]||{}),o[s]),te(s,o[s]);var f=ct[S][s];f&&te(f,o[s]),ra()})}},{key:"reset",value:function(){this.definitions={}}},{key:"_pullDefinitions",value:function(n,a){var r=a.prefix&&a.iconName&&a.icon?{0:a}:a;return Object.keys(r).map(function(i){var o=r[i],s=o.prefix,f=o.iconName,l=o.icon,c=l[2];n[s]||(n[s]={}),c.length>0&&c.forEach(function(u){typeof u=="string"&&(n[s][u]=l)}),n[s][f]=l}),n}}]),t}(),Be=[],tt={},nt={},Si=Object.keys(nt);function Ei(t,e){var n=e.mixoutsTo;return Be=t,tt={},Object.keys(nt).forEach(function(a){Si.indexOf(a)===-1&&delete nt[a]}),Be.forEach(function(a){var r=a.mixout?a.mixout():{};if(Object.keys(r).forEach(function(o){typeof r[o]=="function"&&(n[o]=r[o]),Ft(r[o])==="object"&&Object.keys(r[o]).forEach(function(s){n[o]||(n[o]={}),n[o][s]=r[o][s]})}),a.hooks){var i=a.hooks();Object.keys(i).forEach(function(o){tt[o]||(tt[o]=[]),tt[o].push(i[o])})}a.provides&&a.provides(nt)}),n}function ee(t,e){for(var n=arguments.length,a=new Array(n>2?n-2:0),r=2;r<n;r++)a[r-2]=arguments[r];var i=tt[t]||[];return i.forEach(function(o){e=o.apply(null,[e].concat(a))}),e}function Z(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),a=1;a<e;a++)n[a-1]=arguments[a];var r=tt[t]||[];r.forEach(function(i){i.apply(null,n)})}function Y(){var t=arguments[0],e=Array.prototype.slice.call(arguments,1);return nt[t]?nt[t].apply(null,e):void 0}function ne(t){t.prefix==="fa"&&(t.prefix="fas");var e=t.iconName,n=t.prefix||K();if(e)return e=q(n,e)||e,Ye(oa.definitions,n,e)||Ye(L.styles,n,e)}var oa=new Oi,Ni=function(){p.autoReplaceSvg=!1,p.observeMutations=!1,Z("noAuto")},Ti={i2svg:function(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return U?(Z("beforeI2svg",e),Y("pseudoElements2svg",e),Y("i2svg",e)):Promise.reject("Operation requires a DOM of some kind.")},watch:function(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},n=e.autoReplaceSvgRoot;p.autoReplaceSvg===!1&&(p.autoReplaceSvg=!0),p.observeMutations=!0,vi(function(){Ii({autoReplaceSvgRoot:n}),Z("watch",e)})}},Pi={icon:function(e){if(e===null)return null;if(Ft(e)==="object"&&e.prefix&&e.iconName)return{prefix:e.prefix,iconName:q(e.prefix,e.iconName)||e.iconName};if(Array.isArray(e)&&e.length===2){var n=e[1].indexOf("fa-")===0?e[1].slice(3):e[1],a=$t(e[0]);return{prefix:a,iconName:q(a,n)||n}}if(typeof e=="string"&&(e.indexOf("".concat(p.cssPrefix,"-"))>-1||e.match(qr))){var r=Dt(e.split(" "),{skipLookups:!0});return{prefix:r.prefix||K(),iconName:q(r.prefix,r.iconName)||r.iconName}}if(typeof e=="string"){var i=K();return{prefix:i,iconName:q(i,e)||e}}}},R={noAuto:Ni,config:p,dom:Ti,parse:Pi,library:oa,findIconDefinition:ne,toHtml:pt},Ii=function(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},n=e.autoReplaceSvgRoot,a=n===void 0?E:n;(Object.keys(L.styles).length>0||p.autoFetchSvg)&&U&&p.autoReplaceSvg&&R.dom.i2svg({node:a})};function Mt(t,e){return Object.defineProperty(t,"abstract",{get:e}),Object.defineProperty(t,"html",{get:function(){return t.abstract.map(function(a){return pt(a)})}}),Object.defineProperty(t,"node",{get:function(){if(U){var a=E.createElement("div");return a.innerHTML=t.html,a.children}}}),t}function Fi(t){var e=t.children,n=t.main,a=t.mask,r=t.attributes,i=t.styles,o=t.transform;if(ke(o)&&n.found&&!a.found){var s=n.width,f=n.height,l={x:s/f/2,y:.5};r.style=Lt(d(d({},i),{},{"transform-origin":"".concat(l.x+o.x/16,"em ").concat(l.y+o.y/16,"em")}))}return[{tag:"svg",attributes:r,children:e}]}function ji(t){var e=t.prefix,n=t.iconName,a=t.children,r=t.attributes,i=t.symbol,o=i===!0?"".concat(e,"-").concat(p.cssPrefix,"-").concat(n):i;return[{tag:"svg",attributes:{style:"display: none;"},children:[{tag:"symbol",attributes:d(d({},r),{},{id:o}),children:a}]}]}function Se(t){var e=t.icons,n=e.main,a=e.mask,r=t.prefix,i=t.iconName,o=t.transform,s=t.symbol,f=t.title,l=t.maskId,c=t.titleId,u=t.extra,m=t.watchable,b=m===void 0?!1:m,y=a.found?a:n,A=y.width,k=y.height,x=r==="fak",w=[p.replacementClass,i?"".concat(p.cssPrefix,"-").concat(i):""].filter(function(W){return u.classes.indexOf(W)===-1}).filter(function(W){return W!==""||!!W}).concat(u.classes).join(" "),C={children:[],attributes:d(d({},u.attributes),{},{"data-prefix":r,"data-icon":i,class:w,role:u.attributes.role||"img",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 ".concat(A," ").concat(k)})},O=x&&!~u.classes.indexOf("fa-fw")?{width:"".concat(A/k*16*.0625,"em")}:{};b&&(C.attributes[Q]=""),f&&(C.children.push({tag:"title",attributes:{id:C.attributes["aria-labelledby"]||"title-".concat(c||mt())},children:[f]}),delete C.attributes.title);var N=d(d({},C),{},{prefix:r,iconName:i,main:n,mask:a,maskId:l,transform:o,symbol:s,styles:d(d({},O),u.styles)}),F=a.found&&n.found?Y("generateAbstractMask",N)||{children:[],attributes:{}}:Y("generateAbstractIcon",N)||{children:[],attributes:{}},_=F.children,zt=F.attributes;return N.children=_,N.attributes=zt,s?ji(N):Fi(N)}function He(t){var e=t.content,n=t.width,a=t.height,r=t.transform,i=t.title,o=t.extra,s=t.watchable,f=s===void 0?!1:s,l=d(d(d({},o.attributes),i?{title:i}:{}),{},{class:o.classes.join(" ")});f&&(l[Q]="");var c=d({},o.styles);ke(r)&&(c.transform=ci({transform:r,startCentered:!0,width:n,height:a}),c["-webkit-transform"]=c.transform);var u=Lt(c);u.length>0&&(l.style=u);var m=[];return m.push({tag:"span",attributes:l,children:[e]}),i&&m.push({tag:"span",attributes:{class:"sr-only"},children:[i]}),m}function _i(t){var e=t.content,n=t.title,a=t.extra,r=d(d(d({},a.attributes),n?{title:n}:{}),{},{class:a.classes.join(" ")}),i=Lt(a.styles);i.length>0&&(r.style=i);var o=[];return o.push({tag:"span",attributes:r,children:[e]}),n&&o.push({tag:"span",attributes:{class:"sr-only"},children:[n]}),o}var Bt=L.styles;function ae(t){var e=t[0],n=t[1],a=t.slice(4),r=be(a,1),i=r[0],o=null;return Array.isArray(i)?o={tag:"g",attributes:{class:"".concat(p.cssPrefix,"-").concat(X.GROUP)},children:[{tag:"path",attributes:{class:"".concat(p.cssPrefix,"-").concat(X.SECONDARY),fill:"currentColor",d:i[0]}},{tag:"path",attributes:{class:"".concat(p.cssPrefix,"-").concat(X.PRIMARY),fill:"currentColor",d:i[1]}}]}:o={tag:"path",attributes:{fill:"currentColor",d:i}},{found:!0,width:e,height:n,icon:o}}var Ri={found:!1,width:512,height:512};function Li(t,e){!Gn&&!p.showMissingIcons&&t&&console.error('Icon with name "'.concat(t,'" and prefix "').concat(e,'" is missing.'))}function re(t,e){var n=e;return e==="fa"&&p.styleDefault!==null&&(e=K()),new Promise(function(a,r){if(Y("missingIconAbstract"),n==="fa"){var i=ia(t)||{};t=i.iconName||t,e=i.prefix||e}if(t&&e&&Bt[e]&&Bt[e][t]){var o=Bt[e][t];return a(ae(o))}Li(t,e),a(d(d({},Ri),{},{icon:p.showMissingIcons&&t?Y("missingIconAbstract")||{}:{}}))})}var Ge=function(){},ie=p.measurePerformance&&yt&&yt.mark&&yt.measure?yt:{mark:Ge,measure:Ge},it='FA "6.4.2"',$i=function(e){return ie.mark("".concat(it," ").concat(e," begins")),function(){return sa(e)}},sa=function(e){ie.mark("".concat(it," ").concat(e," ends")),ie.measure("".concat(it," ").concat(e),"".concat(it," ").concat(e," begins"),"".concat(it," ").concat(e," ends"))},Ee={begin:$i,end:sa},Nt=function(){};function Ke(t){var e=t.getAttribute?t.getAttribute(Q):null;return typeof e=="string"}function Di(t){var e=t.getAttribute?t.getAttribute(he):null,n=t.getAttribute?t.getAttribute(ye):null;return e&&n}function Mi(t){return t&&t.classList&&t.classList.contains&&t.classList.contains(p.replacementClass)}function zi(){if(p.autoReplaceSvg===!0)return Tt.replace;var t=Tt[p.autoReplaceSvg];return t||Tt.replace}function Yi(t){return E.createElementNS("http://www.w3.org/2000/svg",t)}function Ui(t){return E.createElement(t)}function fa(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},n=e.ceFn,a=n===void 0?t.tag==="svg"?Yi:Ui:n;if(typeof t=="string")return E.createTextNode(t);var r=a(t.tag);Object.keys(t.attributes||[]).forEach(function(o){r.setAttribute(o,t.attributes[o])});var i=t.children||[];return i.forEach(function(o){r.appendChild(fa(o,{ceFn:a}))}),r}function Wi(t){var e=" ".concat(t.outerHTML," ");return e="".concat(e,"Font Awesome fontawesome.com "),e}var Tt={replace:function(e){var n=e[0];if(n.parentNode)if(e[1].forEach(function(r){n.parentNode.insertBefore(fa(r),n)}),n.getAttribute(Q)===null&&p.keepOriginalSource){var a=E.createComment(Wi(n));n.parentNode.replaceChild(a,n)}else n.remove()},nest:function(e){var n=e[0],a=e[1];if(~xe(n).indexOf(p.replacementClass))return Tt.replace(e);var r=new RegExp("".concat(p.cssPrefix,"-.*"));if(delete a[0].attributes.id,a[0].attributes.class){var i=a[0].attributes.class.split(" ").reduce(function(s,f){return f===p.replacementClass||f.match(r)?s.toSvg.push(f):s.toNode.push(f),s},{toNode:[],toSvg:[]});a[0].attributes.class=i.toSvg.join(" "),i.toNode.length===0?n.removeAttribute("class"):n.setAttribute("class",i.toNode.join(" "))}var o=a.map(function(s){return pt(s)}).join(`
`);n.setAttribute(Q,""),n.innerHTML=o}};function Ve(t){t()}function la(t,e){var n=typeof e=="function"?e:Nt;if(t.length===0)n();else{var a=Ve;p.mutateApproach===Kr&&(a=G.requestAnimationFrame||Ve),a(function(){var r=zi(),i=Ee.begin("mutate");t.map(r),i(),n()})}}var Ne=!1;function ca(){Ne=!0}function oe(){Ne=!1}var _t=null;function Xe(t){if(De&&p.observeMutations){var e=t.treeCallback,n=e===void 0?Nt:e,a=t.nodeCallback,r=a===void 0?Nt:a,i=t.pseudoElementsCallback,o=i===void 0?Nt:i,s=t.observeMutationsRoot,f=s===void 0?E:s;_t=new De(function(l){if(!Ne){var c=K();rt(l).forEach(function(u){if(u.type==="childList"&&u.addedNodes.length>0&&!Ke(u.addedNodes[0])&&(p.searchPseudoElements&&o(u.target),n(u.target)),u.type==="attributes"&&u.target.parentNode&&p.searchPseudoElements&&o(u.target.parentNode),u.type==="attributes"&&Ke(u.target)&&~ti.indexOf(u.attributeName))if(u.attributeName==="class"&&Di(u.target)){var m=Dt(xe(u.target)),b=m.prefix,y=m.iconName;u.target.setAttribute(he,b||c),y&&u.target.setAttribute(ye,y)}else Mi(u.target)&&r(u.target)})}}),U&&_t.observe(f,{childList:!0,attributes:!0,characterData:!0,subtree:!0})}}function Bi(){_t&&_t.disconnect()}function Hi(t){var e=t.getAttribute("style"),n=[];return e&&(n=e.split(";").reduce(function(a,r){var i=r.split(":"),o=i[0],s=i.slice(1);return o&&s.length>0&&(a[o]=s.join(":").trim()),a},{})),n}function Gi(t){var e=t.getAttribute("data-prefix"),n=t.getAttribute("data-icon"),a=t.innerText!==void 0?t.innerText.trim():"",r=Dt(xe(t));return r.prefix||(r.prefix=K()),e&&n&&(r.prefix=e,r.iconName=n),r.iconName&&r.prefix||(r.prefix&&a.length>0&&(r.iconName=Ai(r.prefix,t.innerText)||Ce(r.prefix,Jt(t.innerText))),!r.iconName&&p.autoFetchSvg&&t.firstChild&&t.firstChild.nodeType===Node.TEXT_NODE&&(r.iconName=t.firstChild.data)),r}function Ki(t){var e=rt(t.attributes).reduce(function(r,i){return r.name!=="class"&&r.name!=="style"&&(r[i.name]=i.value),r},{}),n=t.getAttribute("title"),a=t.getAttribute("data-fa-title-id");return p.autoA11y&&(n?e["aria-labelledby"]="".concat(p.replacementClass,"-title-").concat(a||mt()):(e["aria-hidden"]="true",e.focusable="false")),e}function Vi(){return{iconName:null,title:null,titleId:null,prefix:null,transform:$,symbol:!1,mask:{iconName:null,prefix:null,rest:[]},maskId:null,extra:{classes:[],styles:{},attributes:{}}}}function qe(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{styleParser:!0},n=Gi(t),a=n.iconName,r=n.prefix,i=n.rest,o=Ki(t),s=ee("parseNodeAttributes",{},t),f=e.styleParser?Hi(t):[];return d({iconName:a,title:t.getAttribute("title"),titleId:t.getAttribute("data-fa-title-id"),prefix:r,transform:$,mask:{iconName:null,prefix:null,rest:[]},maskId:null,symbol:!1,extra:{classes:i,styles:f,attributes:o}},s)}var Xi=L.styles;function ua(t){var e=p.autoReplaceSvg==="nest"?qe(t,{styleParser:!1}):qe(t);return~e.extra.classes.indexOf(Kn)?Y("generateLayersText",t,e):Y("generateSvgReplacementMutation",t,e)}var V=new Set;we.map(function(t){V.add("fa-".concat(t))});Object.keys(ft[S]).map(V.add.bind(V));Object.keys(ft[T]).map(V.add.bind(V));V=dt(V);function Qe(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;if(!U)return Promise.resolve();var n=E.documentElement.classList,a=function(u){return n.add("".concat(Me,"-").concat(u))},r=function(u){return n.remove("".concat(Me,"-").concat(u))},i=p.autoFetchSvg?V:we.map(function(c){return"fa-".concat(c)}).concat(Object.keys(Xi));i.includes("fa")||i.push("fa");var o=[".".concat(Kn,":not([").concat(Q,"])")].concat(i.map(function(c){return".".concat(c,":not([").concat(Q,"])")})).join(", ");if(o.length===0)return Promise.resolve();var s=[];try{s=rt(t.querySelectorAll(o))}catch{}if(s.length>0)a("pending"),r("complete");else return Promise.resolve();var f=Ee.begin("onTree"),l=s.reduce(function(c,u){try{var m=ua(u);m&&c.push(m)}catch(b){Gn||b.name==="MissingIcon"&&console.error(b)}return c},[]);return new Promise(function(c,u){Promise.all(l).then(function(m){la(m,function(){a("active"),a("complete"),r("pending"),typeof e=="function"&&e(),f(),c()})}).catch(function(m){f(),u(m)})})}function qi(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;ua(t).then(function(n){n&&la([n],e)})}function Qi(t){return function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},a=(e||{}).icon?e:ne(e||{}),r=n.mask;return r&&(r=(r||{}).icon?r:ne(r||{})),t(a,d(d({},n),{},{mask:r}))}}var Zi=function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},a=n.transform,r=a===void 0?$:a,i=n.symbol,o=i===void 0?!1:i,s=n.mask,f=s===void 0?null:s,l=n.maskId,c=l===void 0?null:l,u=n.title,m=u===void 0?null:u,b=n.titleId,y=b===void 0?null:b,A=n.classes,k=A===void 0?[]:A,x=n.attributes,w=x===void 0?{}:x,C=n.styles,O=C===void 0?{}:C;if(e){var N=e.prefix,F=e.iconName,_=e.icon;return Mt(d({type:"icon"},e),function(){return Z("beforeDOMElementCreation",{iconDefinition:e,params:n}),p.autoA11y&&(m?w["aria-labelledby"]="".concat(p.replacementClass,"-title-").concat(y||mt()):(w["aria-hidden"]="true",w.focusable="false")),Se({icons:{main:ae(_),mask:f?ae(f.icon):{found:!1,width:null,height:null,icon:{}}},prefix:N,iconName:F,transform:d(d({},$),r),symbol:o,title:m,maskId:c,titleId:y,extra:{attributes:w,styles:O,classes:k}})})}},Ji={mixout:function(){return{icon:Qi(Zi)}},hooks:function(){return{mutationObserverCallbacks:function(n){return n.treeCallback=Qe,n.nodeCallback=qi,n}}},provides:function(e){e.i2svg=function(n){var a=n.node,r=a===void 0?E:a,i=n.callback,o=i===void 0?function(){}:i;return Qe(r,o)},e.generateSvgReplacementMutation=function(n,a){var r=a.iconName,i=a.title,o=a.titleId,s=a.prefix,f=a.transform,l=a.symbol,c=a.mask,u=a.maskId,m=a.extra;return new Promise(function(b,y){Promise.all([re(r,s),c.iconName?re(c.iconName,c.prefix):Promise.resolve({found:!1,width:512,height:512,icon:{}})]).then(function(A){var k=be(A,2),x=k[0],w=k[1];b([n,Se({icons:{main:x,mask:w},prefix:s,iconName:r,transform:f,symbol:l,maskId:u,title:i,titleId:o,extra:m,watchable:!0})])}).catch(y)})},e.generateAbstractIcon=function(n){var a=n.children,r=n.attributes,i=n.main,o=n.transform,s=n.styles,f=Lt(s);f.length>0&&(r.style=f);var l;return ke(o)&&(l=Y("generateAbstractTransformGrouping",{main:i,transform:o,containerWidth:i.width,iconWidth:i.width})),a.push(l||i.icon),{children:a,attributes:r}}}},to={mixout:function(){return{layer:function(n){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=a.classes,i=r===void 0?[]:r;return Mt({type:"layer"},function(){Z("beforeDOMElementCreation",{assembler:n,params:a});var o=[];return n(function(s){Array.isArray(s)?s.map(function(f){o=o.concat(f.abstract)}):o=o.concat(s.abstract)}),[{tag:"span",attributes:{class:["".concat(p.cssPrefix,"-layers")].concat(dt(i)).join(" ")},children:o}]})}}}},eo={mixout:function(){return{counter:function(n){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=a.title,i=r===void 0?null:r,o=a.classes,s=o===void 0?[]:o,f=a.attributes,l=f===void 0?{}:f,c=a.styles,u=c===void 0?{}:c;return Mt({type:"counter",content:n},function(){return Z("beforeDOMElementCreation",{content:n,params:a}),_i({content:n.toString(),title:i,extra:{attributes:l,styles:u,classes:["".concat(p.cssPrefix,"-layers-counter")].concat(dt(s))}})})}}}},no={mixout:function(){return{text:function(n){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=a.transform,i=r===void 0?$:r,o=a.title,s=o===void 0?null:o,f=a.classes,l=f===void 0?[]:f,c=a.attributes,u=c===void 0?{}:c,m=a.styles,b=m===void 0?{}:m;return Mt({type:"text",content:n},function(){return Z("beforeDOMElementCreation",{content:n,params:a}),He({content:n,transform:d(d({},$),i),title:s,extra:{attributes:u,styles:b,classes:["".concat(p.cssPrefix,"-layers-text")].concat(dt(l))}})})}}},provides:function(e){e.generateLayersText=function(n,a){var r=a.title,i=a.transform,o=a.extra,s=null,f=null;if(Wn){var l=parseInt(getComputedStyle(n).fontSize,10),c=n.getBoundingClientRect();s=c.width/l,f=c.height/l}return p.autoA11y&&!r&&(o.attributes["aria-hidden"]="true"),Promise.resolve([n,He({content:n.innerHTML,width:s,height:f,transform:i,title:r,extra:o,watchable:!0})])}}},ao=new RegExp('"',"ug"),Ze=[1105920,1112319];function ro(t){var e=t.replace(ao,""),n=gi(e,0),a=n>=Ze[0]&&n<=Ze[1],r=e.length===2?e[0]===e[1]:!1;return{value:Jt(r?e[0]:e),isSecondary:a||r}}function Je(t,e){var n="".concat(Gr).concat(e.replace(":","-"));return new Promise(function(a,r){if(t.getAttribute(n)!==null)return a();var i=rt(t.children),o=i.filter(function(_){return _.getAttribute(Zt)===e})[0],s=G.getComputedStyle(t,e),f=s.getPropertyValue("font-family").match(Qr),l=s.getPropertyValue("font-weight"),c=s.getPropertyValue("content");if(o&&!f)return t.removeChild(o),a();if(f&&c!=="none"&&c!==""){var u=s.getPropertyValue("content"),m=~["Sharp"].indexOf(f[2])?T:S,b=~["Solid","Regular","Light","Thin","Duotone","Brands","Kit"].indexOf(f[2])?lt[m][f[2].toLowerCase()]:Zr[m][l],y=ro(u),A=y.value,k=y.isSecondary,x=f[0].startsWith("FontAwesome"),w=Ce(b,A),C=w;if(x){var O=Ci(A);O.iconName&&O.prefix&&(w=O.iconName,b=O.prefix)}if(w&&!k&&(!o||o.getAttribute(he)!==b||o.getAttribute(ye)!==C)){t.setAttribute(n,C),o&&t.removeChild(o);var N=Vi(),F=N.extra;F.attributes[Zt]=e,re(w,b).then(function(_){var zt=Se(d(d({},N),{},{icons:{main:_,mask:Oe()},prefix:b,iconName:C,extra:F,watchable:!0})),W=E.createElementNS("http://www.w3.org/2000/svg","svg");e==="::before"?t.insertBefore(W,t.firstChild):t.appendChild(W),W.outerHTML=zt.map(function(pa){return pt(pa)}).join(`
`),t.removeAttribute(n),a()}).catch(r)}else a()}else a()})}function io(t){return Promise.all([Je(t,"::before"),Je(t,"::after")])}function oo(t){return t.parentNode!==document.head&&!~Vr.indexOf(t.tagName.toUpperCase())&&!t.getAttribute(Zt)&&(!t.parentNode||t.parentNode.tagName!=="svg")}function tn(t){if(U)return new Promise(function(e,n){var a=rt(t.querySelectorAll("*")).filter(oo).map(io),r=Ee.begin("searchPseudoElements");ca(),Promise.all(a).then(function(){r(),oe(),e()}).catch(function(){r(),oe(),n()})})}var so={hooks:function(){return{mutationObserverCallbacks:function(n){return n.pseudoElementsCallback=tn,n}}},provides:function(e){e.pseudoElements2svg=function(n){var a=n.node,r=a===void 0?E:a;p.searchPseudoElements&&tn(r)}}},en=!1,fo={mixout:function(){return{dom:{unwatch:function(){ca(),en=!0}}}},hooks:function(){return{bootstrap:function(){Xe(ee("mutationObserverCallbacks",{}))},noAuto:function(){Bi()},watch:function(n){var a=n.observeMutationsRoot;en?oe():Xe(ee("mutationObserverCallbacks",{observeMutationsRoot:a}))}}}},nn=function(e){var n={size:16,x:0,y:0,flipX:!1,flipY:!1,rotate:0};return e.toLowerCase().split(" ").reduce(function(a,r){var i=r.toLowerCase().split("-"),o=i[0],s=i.slice(1).join("-");if(o&&s==="h")return a.flipX=!0,a;if(o&&s==="v")return a.flipY=!0,a;if(s=parseFloat(s),isNaN(s))return a;switch(o){case"grow":a.size=a.size+s;break;case"shrink":a.size=a.size-s;break;case"left":a.x=a.x-s;break;case"right":a.x=a.x+s;break;case"up":a.y=a.y-s;break;case"down":a.y=a.y+s;break;case"rotate":a.rotate=a.rotate+s;break}return a},n)},lo={mixout:function(){return{parse:{transform:function(n){return nn(n)}}}},hooks:function(){return{parseNodeAttributes:function(n,a){var r=a.getAttribute("data-fa-transform");return r&&(n.transform=nn(r)),n}}},provides:function(e){e.generateAbstractTransformGrouping=function(n){var a=n.main,r=n.transform,i=n.containerWidth,o=n.iconWidth,s={transform:"translate(".concat(i/2," 256)")},f="translate(".concat(r.x*32,", ").concat(r.y*32,") "),l="scale(".concat(r.size/16*(r.flipX?-1:1),", ").concat(r.size/16*(r.flipY?-1:1),") "),c="rotate(".concat(r.rotate," 0 0)"),u={transform:"".concat(f," ").concat(l," ").concat(c)},m={transform:"translate(".concat(o/2*-1," -256)")},b={outer:s,inner:u,path:m};return{tag:"g",attributes:d({},b.outer),children:[{tag:"g",attributes:d({},b.inner),children:[{tag:a.icon.tag,children:a.icon.children,attributes:d(d({},a.icon.attributes),b.path)}]}]}}}},Ht={x:0,y:0,width:"100%",height:"100%"};function an(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!0;return t.attributes&&(t.attributes.fill||e)&&(t.attributes.fill="black"),t}function co(t){return t.tag==="g"?t.children:[t]}var uo={hooks:function(){return{parseNodeAttributes:function(n,a){var r=a.getAttribute("data-fa-mask"),i=r?Dt(r.split(" ").map(function(o){return o.trim()})):Oe();return i.prefix||(i.prefix=K()),n.mask=i,n.maskId=a.getAttribute("data-fa-mask-id"),n}}},provides:function(e){e.generateAbstractMask=function(n){var a=n.children,r=n.attributes,i=n.main,o=n.mask,s=n.maskId,f=n.transform,l=i.width,c=i.icon,u=o.width,m=o.icon,b=li({transform:f,containerWidth:u,iconWidth:l}),y={tag:"rect",attributes:d(d({},Ht),{},{fill:"white"})},A=c.children?{children:c.children.map(an)}:{},k={tag:"g",attributes:d({},b.inner),children:[an(d({tag:c.tag,attributes:d(d({},c.attributes),b.path)},A))]},x={tag:"g",attributes:d({},b.outer),children:[k]},w="mask-".concat(s||mt()),C="clip-".concat(s||mt()),O={tag:"mask",attributes:d(d({},Ht),{},{id:w,maskUnits:"userSpaceOnUse",maskContentUnits:"userSpaceOnUse"}),children:[y,x]},N={tag:"defs",children:[{tag:"clipPath",attributes:{id:C},children:co(m)},O]};return a.push(N,{tag:"rect",attributes:d({fill:"currentColor","clip-path":"url(#".concat(C,")"),mask:"url(#".concat(w,")")},Ht)}),{children:a,attributes:r}}}},mo={provides:function(e){var n=!1;G.matchMedia&&(n=G.matchMedia("(prefers-reduced-motion: reduce)").matches),e.missingIconAbstract=function(){var a=[],r={fill:"currentColor"},i={attributeType:"XML",repeatCount:"indefinite",dur:"2s"};a.push({tag:"path",attributes:d(d({},r),{},{d:"M156.5,447.7l-12.6,29.5c-18.7-9.5-35.9-21.2-51.5-34.9l22.7-22.7C127.6,430.5,141.5,440,156.5,447.7z M40.6,272H8.5 c1.4,21.2,5.4,41.7,11.7,61.1L50,321.2C45.1,305.5,41.8,289,40.6,272z M40.6,240c1.4-18.8,5.2-37,11.1-54.1l-29.5-12.6 C14.7,194.3,10,216.7,8.5,240H40.6z M64.3,156.5c7.8-14.9,17.2-28.8,28.1-41.5L69.7,92.3c-13.7,15.6-25.5,32.8-34.9,51.5 L64.3,156.5z M397,419.6c-13.9,12-29.4,22.3-46.1,30.4l11.9,29.8c20.7-9.9,39.8-22.6,56.9-37.6L397,419.6z M115,92.4 c13.9-12,29.4-22.3,46.1-30.4l-11.9-29.8c-20.7,9.9-39.8,22.6-56.8,37.6L115,92.4z M447.7,355.5c-7.8,14.9-17.2,28.8-28.1,41.5 l22.7,22.7c13.7-15.6,25.5-32.9,34.9-51.5L447.7,355.5z M471.4,272c-1.4,18.8-5.2,37-11.1,54.1l29.5,12.6 c7.5-21.1,12.2-43.5,13.6-66.8H471.4z M321.2,462c-15.7,5-32.2,8.2-49.2,9.4v32.1c21.2-1.4,41.7-5.4,61.1-11.7L321.2,462z M240,471.4c-18.8-1.4-37-5.2-54.1-11.1l-12.6,29.5c21.1,7.5,43.5,12.2,66.8,13.6V471.4z M462,190.8c5,15.7,8.2,32.2,9.4,49.2h32.1 c-1.4-21.2-5.4-41.7-11.7-61.1L462,190.8z M92.4,397c-12-13.9-22.3-29.4-30.4-46.1l-29.8,11.9c9.9,20.7,22.6,39.8,37.6,56.9 L92.4,397z M272,40.6c18.8,1.4,36.9,5.2,54.1,11.1l12.6-29.5C317.7,14.7,295.3,10,272,8.5V40.6z M190.8,50 c15.7-5,32.2-8.2,49.2-9.4V8.5c-21.2,1.4-41.7,5.4-61.1,11.7L190.8,50z M442.3,92.3L419.6,115c12,13.9,22.3,29.4,30.5,46.1 l29.8-11.9C470,128.5,457.3,109.4,442.3,92.3z M397,92.4l22.7-22.7c-15.6-13.7-32.8-25.5-51.5-34.9l-12.6,29.5 C370.4,72.1,384.4,81.5,397,92.4z"})});var o=d(d({},i),{},{attributeName:"opacity"}),s={tag:"circle",attributes:d(d({},r),{},{cx:"256",cy:"364",r:"28"}),children:[]};return n||s.children.push({tag:"animate",attributes:d(d({},i),{},{attributeName:"r",values:"28;14;28;28;14;28;"})},{tag:"animate",attributes:d(d({},o),{},{values:"1;0;1;1;0;1;"})}),a.push(s),a.push({tag:"path",attributes:d(d({},r),{},{opacity:"1",d:"M263.7,312h-16c-6.6,0-12-5.4-12-12c0-71,77.4-63.9,77.4-107.8c0-20-17.8-40.2-57.4-40.2c-29.1,0-44.3,9.6-59.2,28.7 c-3.9,5-11.1,6-16.2,2.4l-13.1-9.2c-5.6-3.9-6.9-11.8-2.6-17.2c21.2-27.2,46.4-44.7,91.2-44.7c52.3,0,97.4,29.8,97.4,80.2 c0,67.6-77.4,63.5-77.4,107.8C275.7,306.6,270.3,312,263.7,312z"}),children:n?[]:[{tag:"animate",attributes:d(d({},o),{},{values:"1;0;0;0;0;1;"})}]}),n||a.push({tag:"path",attributes:d(d({},r),{},{opacity:"0",d:"M232.5,134.5l7,168c0.3,6.4,5.6,11.5,12,11.5h9c6.4,0,11.7-5.1,12-11.5l7-168c0.3-6.8-5.2-12.5-12-12.5h-23 C237.7,122,232.2,127.7,232.5,134.5z"}),children:[{tag:"animate",attributes:d(d({},o),{},{values:"0;0;1;1;0;0;"})}]}),{tag:"g",attributes:{class:"missing"},children:a}}}},vo={hooks:function(){return{parseNodeAttributes:function(n,a){var r=a.getAttribute("data-fa-symbol"),i=r===null?!1:r===""?!0:r;return n.symbol=i,n}}}},po=[mi,Ji,to,eo,no,so,fo,lo,uo,mo,vo];Ei(po,{mixoutsTo:R});R.noAuto;R.config;R.library;R.dom;var se=R.parse;R.findIconDefinition;R.toHtml;var bo=R.icon;R.layer;R.text;R.counter;function rn(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);e&&(a=a.filter(function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable})),n.push.apply(n,a)}return n}function H(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?rn(Object(n),!0).forEach(function(a){et(t,a,n[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):rn(Object(n)).forEach(function(a){Object.defineProperty(t,a,Object.getOwnPropertyDescriptor(n,a))})}return t}function Rt(t){"@babel/helpers - typeof";return Rt=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},Rt(t)}function et(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function go(t,e){if(t==null)return{};var n={},a=Object.keys(t),r,i;for(i=0;i<a.length;i++)r=a[i],!(e.indexOf(r)>=0)&&(n[r]=t[r]);return n}function ho(t,e){if(t==null)return{};var n=go(t,e),a,r;if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);for(r=0;r<i.length;r++)a=i[r],!(e.indexOf(a)>=0)&&Object.prototype.propertyIsEnumerable.call(t,a)&&(n[a]=t[a])}return n}function fe(t){return yo(t)||wo(t)||xo(t)||ko()}function yo(t){if(Array.isArray(t))return le(t)}function wo(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function xo(t,e){if(t){if(typeof t=="string")return le(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);if(n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set")return Array.from(t);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return le(t,e)}}function le(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,a=new Array(e);n<e;n++)a[n]=t[n];return a}function ko(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Ao(t){var e,n=t.beat,a=t.fade,r=t.beatFade,i=t.bounce,o=t.shake,s=t.flash,f=t.spin,l=t.spinPulse,c=t.spinReverse,u=t.pulse,m=t.fixedWidth,b=t.inverse,y=t.border,A=t.listItem,k=t.flip,x=t.size,w=t.rotation,C=t.pull,O=(e={"fa-beat":n,"fa-fade":a,"fa-beat-fade":r,"fa-bounce":i,"fa-shake":o,"fa-flash":s,"fa-spin":f,"fa-spin-reverse":c,"fa-spin-pulse":l,"fa-pulse":u,"fa-fw":m,"fa-inverse":b,"fa-border":y,"fa-li":A,"fa-flip":k===!0,"fa-flip-horizontal":k==="horizontal"||k==="both","fa-flip-vertical":k==="vertical"||k==="both"},et(e,"fa-".concat(x),typeof x<"u"&&x!==null),et(e,"fa-rotate-".concat(w),typeof w<"u"&&w!==null&&w!==0),et(e,"fa-pull-".concat(C),typeof C<"u"&&C!==null),et(e,"fa-swap-opacity",t.swapOpacity),e);return Object.keys(O).map(function(N){return O[N]?N:null}).filter(function(N){return N})}function Co(t){return t=t-0,t===t}function ma(t){return Co(t)?t:(t=t.replace(/[\-_\s]+(.)?/g,function(e,n){return n?n.toUpperCase():""}),t.substr(0,1).toLowerCase()+t.substr(1))}var Oo=["style"];function So(t){return t.charAt(0).toUpperCase()+t.slice(1)}function Eo(t){return t.split(";").map(function(e){return e.trim()}).filter(function(e){return e}).reduce(function(e,n){var a=n.indexOf(":"),r=ma(n.slice(0,a)),i=n.slice(a+1).trim();return r.startsWith("webkit")?e[So(r)]=i:e[r]=i,e},{})}function da(t,e){var n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};if(typeof e=="string")return e;var a=(e.children||[]).map(function(f){return da(t,f)}),r=Object.keys(e.attributes||{}).reduce(function(f,l){var c=e.attributes[l];switch(l){case"class":f.attrs.className=c,delete e.attributes.class;break;case"style":f.attrs.style=Eo(c);break;default:l.indexOf("aria-")===0||l.indexOf("data-")===0?f.attrs[l.toLowerCase()]=c:f.attrs[ma(l)]=c}return f},{attrs:{}}),i=n.style,o=i===void 0?{}:i,s=ho(n,Oo);return r.attrs.style=H(H({},r.attrs.style),o),t.apply(void 0,[e.tag,H(H({},r.attrs),s)].concat(fe(a)))}var va=!1;try{va=!0}catch{}function No(){if(!va&&console&&typeof console.error=="function"){var t;(t=console).error.apply(t,arguments)}}function on(t){if(t&&Rt(t)==="object"&&t.prefix&&t.iconName&&t.icon)return t;if(se.icon)return se.icon(t);if(t===null)return null;if(t&&Rt(t)==="object"&&t.prefix&&t.iconName)return t;if(Array.isArray(t)&&t.length===2)return{prefix:t[0],iconName:t[1]};if(typeof t=="string")return{prefix:"fas",iconName:t}}function Gt(t,e){return Array.isArray(e)&&e.length>0||!Array.isArray(e)&&e?et({},t,e):{}}var bt=Pt.forwardRef(function(t,e){var n=t.icon,a=t.mask,r=t.symbol,i=t.className,o=t.title,s=t.titleId,f=t.maskId,l=on(n),c=Gt("classes",[].concat(fe(Ao(t)),fe(i.split(" ")))),u=Gt("transform",typeof t.transform=="string"?se.transform(t.transform):t.transform),m=Gt("mask",on(a)),b=bo(l,H(H(H(H({},c),u),m),{},{symbol:r,title:o,titleId:s,maskId:f}));if(!b)return No("Could not find icon",l),null;var y=b.abstract,A={ref:e};return Object.keys(t).forEach(function(k){bt.defaultProps.hasOwnProperty(k)||(A[k]=t[k])}),To(y[0],A)});bt.displayName="FontAwesomeIcon";bt.propTypes={beat:h.bool,border:h.bool,beatFade:h.bool,bounce:h.bool,className:h.string,fade:h.bool,flash:h.bool,mask:h.oneOfType([h.object,h.array,h.string]),maskId:h.string,fixedWidth:h.bool,inverse:h.bool,flip:h.oneOf([!0,!1,"horizontal","vertical","both"]),icon:h.oneOfType([h.object,h.array,h.string]),listItem:h.bool,pull:h.oneOf(["right","left"]),pulse:h.bool,rotation:h.oneOf([0,90,180,270]),shake:h.bool,size:h.oneOf(["2xs","xs","sm","lg","xl","2xl","1x","2x","3x","4x","5x","6x","7x","8x","9x","10x"]),spin:h.bool,spinPulse:h.bool,spinReverse:h.bool,symbol:h.oneOfType([h.bool,h.string]),title:h.string,titleId:h.string,transform:h.oneOfType([h.string,h.object]),swapOpacity:h.bool};bt.defaultProps={border:!1,className:"",mask:null,maskId:null,fixedWidth:!1,inverse:!1,flip:!1,icon:null,listItem:!1,pull:null,pulse:!1,rotation:null,size:null,spin:!1,spinPulse:!1,spinReverse:!1,beat:!1,fade:!1,beatFade:!1,bounce:!1,shake:!1,symbol:!1,title:"",titleId:null,transform:null,swapOpacity:!1};var To=da.bind(null,Pt.createElement),Po={prefix:"fas",iconName:"file",icon:[384,512,[128196,128459,61462],"f15b","M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z"]},Io={prefix:"fas",iconName:"xmark",icon:[384,512,[128473,10005,10006,10060,215,"close","multiply","remove","times"],"f00d","M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"]},Fo=Io,jo={prefix:"fas",iconName:"check",icon:[448,512,[10003,10004],"f00c","M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"]};function _o({uploadFormData:t}){const[e,n]=v.useState([]),[a,r]=v.useState([]),[i,o]=v.useState(""),[s,f]=v.useState("_default");v.useEffect(()=>{u()},[]);const l=x=>{if(o(""),x.currentTarget.files===null)return;const w=Array.from(x.currentTarget.files);r(w)},c=async x=>{x.preventDefault();const w=new FormData;w.append("path",t.currentSource),a.forEach(O=>{w.append(O.name,O)}),(await fetch("/api/v1/upload",{method:"POST",body:w})).status===201?(o("success"),window.KGcreator.uploadFormData.selectedFiles=a.map(O=>O.name),window.KGcreator.createCsvSourceMappings()):o("error")},u=async()=>{const C=(await(await fetch("/api/v1/kg/data?type=sql.sqlserver&dbName=master&sqlQuery=SELECT name FROM sys.databases")).json()).map(O=>O.name);n(C)},m=x=>{const w=x.currentTarget.value;f(w),window.KGcreator.uploadFormData.selectedDatabase=w,window.KGcreator.createDataBaseSourceMappings()},b=g.jsxs(gt.Select,{defaultValue:"_default",value:s,onChange:m,"aria-label":"Select database",children:[g.jsx("option",{value:"_default",disabled:!0,children:"Select database"}),e.map(x=>g.jsx("option",{value:x,children:x},x))]}),y=g.jsxs(gt.Group,{controlId:"formFileMultiple",className:"mb-3",children:[g.jsx(gt.Control,{name:"files",type:"file",multiple:!0,accept:".csv,.tsv",onChange:l}),g.jsx(gt.Text,{color:"muted",children:g.jsx("p",{children:"Supported files: CSV"})})]}),A=g.jsx("div",{className:"mb-3",children:g.jsxs(Za,{variant:"primary",onClick:c,children:[g.jsx(bt,{icon:i==="success"?jo:i==="error"?Fo:Po})," Upload ",a.length," ",a.length===1?"file":"files"]})}),k=x=>g.jsx(Lr,{variant:"danger",children:x});return window.KGcreator.uploadFormData.displayForm=="database"?g.jsx(An,{className:"mb-3 px-1",children:b}):window.KGcreator.uploadFormData.displayForm=="file"?g.jsx(g.Fragment,{children:g.jsxs(Ka,{children:[y,a.length>0?A:null,i==="error"?k("Error during upload"):null]})}):g.jsx(g.Fragment,{})}const Ro=document.getElementById("mount-kg-upload-app-here"),Lo=ka(Ro);Lo.render(g.jsx(_o,{uploadFormData:window.KGcreator.uploadFormData}));
