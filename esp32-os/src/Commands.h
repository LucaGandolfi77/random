#pragma once

void Commands_registerAll();
void Commands_initUptime();

void Cmd_help(int argc, char** argv);
void Cmd_uname(int argc, char** argv);
void Cmd_sysinfo(int argc, char** argv);
void Cmd_uptime(int argc, char** argv);
void Cmd_free(int argc, char** argv);
void Cmd_reboot(int argc, char** argv);
void Cmd_clear(int argc, char** argv);
void Cmd_echo(int argc, char** argv);
void Cmd_ps(int argc, char** argv);
void Cmd_kill(int argc, char** argv);
void Cmd_blink(int argc, char** argv);
void Cmd_ls(int argc, char** argv);
void Cmd_cd(int argc, char** argv);
void Cmd_pwd(int argc, char** argv);
void Cmd_cat(int argc, char** argv);
void Cmd_write(int argc, char** argv);
void Cmd_append(int argc, char** argv);
void Cmd_rm(int argc, char** argv);
void Cmd_mkdir(int argc, char** argv);
void Cmd_rmdir(int argc, char** argv);
void Cmd_df(int argc, char** argv);
void Cmd_run(int argc, char** argv);
void Cmd_wifi(int argc, char** argv);
