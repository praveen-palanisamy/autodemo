#!/usr/bin/env bash
# AutoDemo: Bun tab completion with reliable package.json script listing.
#
# Bun's upstream regex reads past the scripts block on typical package.json files,
# so `bun run <tab>` can fail or list dependency names. This wrapper loads the
# official completions, then replaces only script-name discovery.
#
# Install once: bun run setup:completions

if ! declare -F _bun_completions >/dev/null 2>&1; then
  if command -v bun >/dev/null 2>&1; then
    # shellcheck disable=SC1090
    source <(bun completions 2>/dev/null) || return 0
  else
    return 0
  fi
fi

_read_scripts_in_package_json() {
  local line=0
  local working_dir="${PWD}"
  local package_json_compreply=()

  for ((; line < ${#COMP_WORDS[@]}; line+=1)); do
    [[ "${COMP_WORDS[${line}]}" == "--cwd" ]] && working_dir="${COMP_WORDS[$((line + 1))]}"
  done

  [[ -f "${working_dir}/package.json" ]] || return

  local scripts
  scripts=$(
    cd "${working_dir}" &&
      bun -e "import pkg from './package.json' with { type: 'json' }; process.stdout.write(Object.keys(pkg.scripts ?? {}).join(' '))" 2>/dev/null
  )
  [[ -n "${scripts}" ]] || return

  read -ra package_json_compreply <<<"${scripts}"
  COMPREPLY+=($(compgen -W "${scripts}" -- "${cur_word}"))

  local re_prev_script="(^| )${prev}($| )"
  [[
    ("${COMPREPLY[*]}" =~ ${re_prev_script} && -n "${COMP_WORDS[2]}")
  ]] && {
    local re_script
    re_script=$(echo "${package_json_compreply[@]}" | sed 's/[^ ]*/(&)/g')
    local new_reply
    new_reply=$(echo "${COMPREPLY[@]}" | sed -E "s/${re_script}//")
    COMPREPLY=($(compgen -W "${new_reply}" -- "${cur_word}"))
    replaced_script="${prev}"
  }
}

complete -o bashdefault -o default -F _bun_completions bun 2>/dev/null || complete -F _bun_completions bun
