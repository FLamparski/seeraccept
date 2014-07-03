let SessionLoad = 1
if &cp | set nocp | endif
let s:cpo_save=&cpo
set cpo&vim
inoremap <C-Space> 
inoremap <expr> <Up> pumvisible() ? "\" : "\<Up>"
inoremap <expr> <Down> pumvisible() ? "\" : "\<Down>"
inoremap <expr> <S-Tab> pumvisible() ? "\" : "\<S-Tab>"
inoremap <silent> <C-Tab> =UltiSnips_ListSnippets()
snoremap <silent>  c
xnoremap 	 :call UltiSnips_SaveLastVisualSelection()gvs
snoremap <silent> 	 :call UltiSnips_ExpandSnippet()
snoremap <silent> <NL> :call UltiSnips_JumpForwards()
snoremap <silent>  :call UltiSnips_JumpBackwards()
nnoremap <silent>  :nohlsearch
vmap [% [%m'gv``
nnoremap \d :YcmShowDetailedDiagnostic
nmap \qa <Plug>QAToolsToggle
nmap \qc <Plug>CodeCoverageToggle
vnoremap \e :python debugger.handle_visual_eval()
nmap \ihn :IHN
nmap \is :IHS:A
nmap \ih :IHS
vmap ]% ]%m'gv``
vmap a% [%v]%
nmap gx <Plug>NetrwBrowseX
nnoremap <silent> <Plug>NetrwBrowseX :call netrw#NetrwBrowseX(expand("<cWORD>"),0)
nnoremap <silent> <SNR>49_QAToolsToggle :call phpqa#QAToolsToggle()
nnoremap <silent> <SNR>49_CodeCoverageToggle :call phpqa#CodeCoverageToggle()
nnoremap <Plug>FireplaceSource :Source 
noremap <F10> :python debugger.set_breakpoint()
noremap <F5> :python debugger.run()
snoremap <silent> <Del> c
snoremap <silent> <BS> c
snoremap <silent> <C-Tab> :call UltiSnips_ListSnippets()
nmap <C-F12> :!ctags -R --sort=yes --c++-kinds=+p --fields=+iaS --extra=+q .
nmap <F8> :TagbarToggle
inoremap <expr> 	 pumvisible() ? "\" : "\	"
inoremap <silent> <NL> =UltiSnips_JumpForwards()
inoremap <silent>  =UltiSnips_JumpBackwards()
inoremap  u
imap \ihn :IHN
imap \is :IHS:A
imap \ih :IHS
let &cpo=s:cpo_save
unlet s:cpo_save
set autoindent
set autoread
set background=dark
set backspace=indent,eol,start
set balloonexpr=SyntasticBalloonsExprNotifier()
set complete=.,w,b,u,t
set completefunc=youcompleteme#Complete
set completeopt=preview,menuone
set display=lastline
set expandtab
set fileencodings=ucs-bom,utf-8,default,latin1
set fileformats=unix,dos,mac
set fillchars=vert:|,fold:-,stl:\ ,stlnc:\\
set foldopen=block,hor,mark,percent,quickfix,tag,undo
set guifont=Source\ Code\ Pro\ for\ Powerline\ Medium\ 13
set helplang=en
set history=1000
set iminsert=0
set incsearch
set isident=@,48-57,_,192-255,$
set laststatus=2
set listchars=tab:⇥\ ,trail:␣,extends:⇉,precedes:⇇,nbsp:·
set mouse=a
set nrformats=hex
set ruler
set runtimepath=~/.vim,~/.vim/bundle/YouCompleteMe,~/.vim/bundle/jedi,~/.vim/bundle/php.vim,~/.vim/bundle/phpcomplete.vim,~/.vim/bundle/powerline,~/.vim/bundle/python-syntax,~/.vim/bundle/python3s,~/.vim/bundle/rainbow_parentheses.vim,~/.vim/bundle/rust.vim,~/.vim/bundle/supertab,~/.vim/bundle/syntastic,~/.vim/bundle/tagbar,~/.vim/bundle/tern_for_vim,~/.vim/bundle/ultisnips,~/.vim/bundle/vdebug,~/.vim/bundle/vim-classpath,~/.vim/bundle/vim-clojure-static,~/.vim/bundle/vim-coffee-script,~/.vim/bundle/vim-css-color,~/.vim/bundle/vim-css3-syntax,~/.vim/bundle/vim-fireplace,~/.vim/bundle/vim-haml,~/.vim/bundle/vim-less,~/.vim/bundle/vim-markdown,~/.vim/bundle/vim-phpqa,~/.vim/bundle/vim-sauce,~/.vim/bundle/vim-sensible,/usr/local/share/vim/vimfiles,/usr/local/share/vim/vim74a,/usr/local/share/vim/vimfiles/after,~/.vim/bundle/rust.vim/after,~/.vim/bundle/tern_for_vim/after,~/.vim/bundle/ultisnips/after,~/.vim/bundle/vim-coffee-script/after,~/.vim/bundle/vim-css-color/after,~/.vim/bundle/vim-css3-syntax/after,~/.vim/bundle/vim-markdown/after,~/.vim/after,~/.vim/bundle/powerline/powerline/bindings/vim
set scrolloff=1
set shell=/bin/bash
set shiftround
set shiftwidth=4
set showcmd
set showmatch
set sidescrolloff=5
set smarttab
set statusline=%!pyeval('powerline.new_window()')
set tabpagemax=50
set tabstop=4
set termencoding=utf-8
set ttimeout
set ttimeoutlen=50
set updatetime=100
set viminfo=!,'100,<50,s10,h
set wildmenu
set window=39
let s:so_save = &so | let s:siso_save = &siso | set so=0 siso=0
let v:this_session=expand("<sfile>:p")
silent only
cd ~/seeraccept
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
set shortmess=aoO
badd +165 ~/FLamparski.github.io/index.html
badd +74 ~/FLamparski.github.io/sass/screen.scss
badd +102 server/checkmail.js
badd +127 client/index.html
badd +15 client/client.js
badd +14 server/config.js
badd +31 server/publish.js
badd +16 lib/schemas.js
badd +5 settings-enlintel.json
badd +4 settings-deploy.json
badd +1 server/accounts.js
badd +1 settings.json
badd +12 README.md
silent! argdel *
edit client/client.js
set splitbelow splitright
wincmd _ | wincmd |
vsplit
1wincmd h
wincmd w
set nosplitbelow
set nosplitright
wincmd t
set winheight=1 winwidth=1
exe 'vert 1resize ' . ((&columns * 90 + 94) / 188)
exe 'vert 2resize ' . ((&columns * 97 + 94) / 188)
argglobal
setlocal keymap=
setlocal noarabic
setlocal autoindent
setlocal balloonexpr=
setlocal nobinary
setlocal bufhidden=
setlocal buflisted
setlocal buftype=
setlocal cindent
setlocal cinkeys=0{,0},0),:,0#,!^F,o,O,e
setlocal cinoptions=j1,J1
setlocal cinwords=if,else,while,do,for,switch
setlocal colorcolumn=
setlocal comments=sO:*\ -,mO:*\ \ ,exO:*/,s1:/*,mb:*,ex:*/,://
setlocal commentstring=//%s
setlocal complete=.,w,b,u,t
setlocal concealcursor=
setlocal conceallevel=0
setlocal completefunc=youcompleteme#Complete
setlocal nocopyindent
setlocal cryptmethod=
setlocal nocursorbind
setlocal nocursorcolumn
setlocal nocursorline
setlocal define=
setlocal dictionary=
setlocal nodiff
setlocal equalprg=
setlocal errorformat=
setlocal expandtab
if &filetype != 'javascript'
setlocal filetype=javascript
endif
setlocal foldcolumn=0
setlocal foldenable
setlocal foldexpr=0
setlocal foldignore=#
setlocal foldlevel=0
setlocal foldmarker={{{,}}}
set foldmethod=expr
setlocal foldmethod=expr
setlocal foldminlines=1
setlocal foldnestmax=20
setlocal foldtext=foldtext()
setlocal formatexpr=
setlocal formatoptions=croql
setlocal formatlistpat=^\\s*\\d\\+[\\]:.)}\\t\ ]\\s*
setlocal grepprg=
setlocal iminsert=0
setlocal imsearch=2
setlocal include=
setlocal includeexpr=
setlocal indentexpr=
setlocal indentkeys=0{,0},:,0#,!^F,o,O,e
setlocal noinfercase
setlocal iskeyword=@,48-57,_,192-255
setlocal keywordprg=
setlocal nolinebreak
setlocal nolisp
setlocal nolist
setlocal makeprg=
setlocal matchpairs=(:),{:},[:]
setlocal modeline
setlocal modifiable
setlocal nrformats=hex
set number
setlocal number
setlocal numberwidth=4
setlocal omnifunc=tern#Complete
setlocal path=
setlocal nopreserveindent
setlocal nopreviewwindow
setlocal quoteescape=\\
setlocal noreadonly
setlocal norelativenumber
setlocal norightleft
setlocal rightleftcmd=search
setlocal noscrollbind
setlocal shiftwidth=4
setlocal noshortname
setlocal nosmartindent
setlocal softtabstop=0
setlocal nospell
setlocal spellcapcheck=[.?!]\\_[\\])'\"\	\ ]\\+
setlocal spellfile=
setlocal spelllang=en
setlocal statusline=%!pyeval('powerline.statusline(1)')
setlocal suffixesadd=
setlocal swapfile
setlocal synmaxcol=3000
if &syntax != 'javascript'
setlocal syntax=javascript
endif
setlocal tabstop=4
setlocal tags=
setlocal textwidth=0
setlocal thesaurus=
setlocal noundofile
setlocal nowinfixheight
setlocal nowinfixwidth
setlocal wrap
setlocal wrapmargin=0
let s:l = 200 - ((17 * winheight(0) + 19) / 38)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
200
normal! 05|
wincmd w
argglobal
edit server/accounts.js
setlocal keymap=
setlocal noarabic
setlocal autoindent
setlocal balloonexpr=
setlocal nobinary
setlocal bufhidden=
setlocal buflisted
setlocal buftype=
setlocal cindent
setlocal cinkeys=0{,0},0),:,0#,!^F,o,O,e
setlocal cinoptions=j1,J1
setlocal cinwords=if,else,while,do,for,switch
setlocal colorcolumn=
setlocal comments=sO:*\ -,mO:*\ \ ,exO:*/,s1:/*,mb:*,ex:*/,://
setlocal commentstring=//%s
setlocal complete=.,w,b,u,t
setlocal concealcursor=
setlocal conceallevel=0
setlocal completefunc=youcompleteme#Complete
setlocal nocopyindent
setlocal cryptmethod=
setlocal nocursorbind
setlocal nocursorcolumn
setlocal nocursorline
setlocal define=
setlocal dictionary=
setlocal nodiff
setlocal equalprg=
setlocal errorformat=
setlocal expandtab
if &filetype != 'javascript'
setlocal filetype=javascript
endif
setlocal foldcolumn=0
setlocal foldenable
setlocal foldexpr=0
setlocal foldignore=#
setlocal foldlevel=0
setlocal foldmarker={{{,}}}
set foldmethod=expr
setlocal foldmethod=manual
setlocal foldminlines=1
setlocal foldnestmax=20
setlocal foldtext=foldtext()
setlocal formatexpr=
setlocal formatoptions=croql
setlocal formatlistpat=^\\s*\\d\\+[\\]:.)}\\t\ ]\\s*
setlocal grepprg=
setlocal iminsert=0
setlocal imsearch=2
setlocal include=
setlocal includeexpr=
setlocal indentexpr=
setlocal indentkeys=0{,0},:,0#,!^F,o,O,e
setlocal noinfercase
setlocal iskeyword=@,48-57,_,192-255
setlocal keywordprg=
setlocal nolinebreak
setlocal nolisp
setlocal nolist
setlocal makeprg=
setlocal matchpairs=(:),{:},[:]
setlocal modeline
setlocal modifiable
setlocal nrformats=hex
set number
setlocal number
setlocal numberwidth=4
setlocal omnifunc=tern#Complete
setlocal path=
setlocal nopreserveindent
setlocal nopreviewwindow
setlocal quoteescape=\\
setlocal noreadonly
setlocal norelativenumber
setlocal norightleft
setlocal rightleftcmd=search
setlocal noscrollbind
setlocal shiftwidth=4
setlocal noshortname
setlocal nosmartindent
setlocal softtabstop=0
setlocal nospell
setlocal spellcapcheck=[.?!]\\_[\\])'\"\	\ ]\\+
setlocal spellfile=
setlocal spelllang=en
setlocal statusline=%!pyeval('powerline.statusline(2)')
setlocal suffixesadd=
setlocal swapfile
setlocal synmaxcol=3000
if &syntax != 'javascript'
setlocal syntax=javascript
endif
setlocal tabstop=4
setlocal tags=
setlocal textwidth=0
setlocal thesaurus=
setlocal noundofile
setlocal nowinfixheight
setlocal nowinfixwidth
setlocal wrap
setlocal wrapmargin=0
silent! normal! zE
let s:l = 33 - ((25 * winheight(0) + 19) / 38)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
33
normal! 03|
wincmd w
2wincmd w
exe 'vert 1resize ' . ((&columns * 90 + 94) / 188)
exe 'vert 2resize ' . ((&columns * 97 + 94) / 188)
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
