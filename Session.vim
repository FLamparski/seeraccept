let SessionLoad = 1
if &cp | set nocp | endif
let s:so_save = &so | let s:siso_save = &siso | set so=0 siso=0
let v:this_session=expand("<sfile>:p")
silent only
cd ~/seeraccept
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
set shortmess=aoO
badd +32 client/index.html
badd +165 ~/FLamparski.github.io/index.html
badd +74 ~/FLamparski.github.io/sass/screen.scss
badd +102 server/checkmail.js
badd +191 client/client.js
badd +14 server/config.js
badd +31 server/publish.js
badd +16 lib/schemas.js
badd +5 settings-enlintel.json
badd +4 settings-deploy.json
badd +35 server/accounts.js
badd +1 settings.json
badd +12 README.md
badd +17 client/client.less
silent! argdel *
edit client/client.less
set splitbelow splitright
wincmd _ | wincmd |
vsplit
1wincmd h
wincmd _ | wincmd |
split
1wincmd k
wincmd w
wincmd w
set nosplitbelow
set nosplitright
wincmd t
set winheight=1 winwidth=1
exe '1resize ' . ((&lines * 19 + 20) / 41)
exe 'vert 1resize ' . ((&columns * 90 + 94) / 188)
exe '2resize ' . ((&lines * 19 + 20) / 41)
exe 'vert 2resize ' . ((&columns * 90 + 94) / 188)
exe 'vert 3resize ' . ((&columns * 97 + 94) / 188)
argglobal
setlocal fdm=expr
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
let s:l = 15 - ((14 * winheight(0) + 9) / 19)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
15
normal! 0
wincmd w
argglobal
edit client/index.html
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
let s:l = 40 - ((7 * winheight(0) + 9) / 19)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
40
normal! 028|
wincmd w
argglobal
edit client/client.js
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
let s:l = 16 - ((15 * winheight(0) + 19) / 39)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
16
normal! 03|
wincmd w
3wincmd w
exe '1resize ' . ((&lines * 19 + 20) / 41)
exe 'vert 1resize ' . ((&columns * 90 + 94) / 188)
exe '2resize ' . ((&lines * 19 + 20) / 41)
exe 'vert 2resize ' . ((&columns * 90 + 94) / 188)
exe 'vert 3resize ' . ((&columns * 97 + 94) / 188)
tabnext 1
if exists('s:wipebuf')
  silent exe 'bwipe ' . s:wipebuf
endif
unlet! s:wipebuf
set winheight=1 winwidth=20 shortmess=filnxtToO
let s:sx = expand("<sfile>:p:r")."x.vim"
if file_readable(s:sx)
  exe "source " . fnameescape(s:sx)
endif
let &so = s:so_save | let &siso = s:siso_save
doautoall SessionLoadPost
unlet SessionLoad
" vim: set ft=vim :
