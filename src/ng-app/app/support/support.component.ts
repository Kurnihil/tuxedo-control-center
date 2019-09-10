import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { ProgramManagementService } from '../program-management.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {

  public anydeskProgramName = 'anydesk';
  public anydeskInstalled: boolean;

  public formTicketNumber: FormGroup;
  public systeminfoRunOutput = '';
  public systeminfoRunProgress = false;
  public systeminfoFilePath = '/tmp/tcc/systeminfos.sh';
  public systeminfosURL = 'https://mytuxedo.de/index.php/s/DcAeZk4TbBTTjRq/download';

  constructor(
    private electron: ElectronService,
    private program: ProgramManagementService,
    private utils: UtilsService
  ) { }

  ngOnInit() {
    this.updateAnydeskInstallStatus();
    this.formTicketNumber = new FormGroup({
      inputTicketNumber: new FormControl('', Validators.required)
    });
  }

  public focusControl(control): void {
    setImmediate(() => { control.focus(); });
  }

  public openExternalUrl(url: string): void {
    this.electron.shell.openExternal(url);
  }

  public updateAnydeskInstallStatus(): void {
    if (!this.progress().get(this.anydeskProgramName)) {
      this.program.isInstalled(this.anydeskProgramName).then((isInstalled) => {
        this.anydeskInstalled = isInstalled;
      });
    }
  }

  public buttonInstallRemoveAnydesk(): void {
    if (this.anydeskInstalled) {
      this.program.remove(this.anydeskProgramName).then(() => {
        this.updateAnydeskInstallStatus();
      });
    } else {
      this.program.install(this.anydeskProgramName).then(() => {
        this.updateAnydeskInstallStatus();
      });
    }
  }

  public buttonStartAnydesk(): void {
    this.program.run(this.anydeskProgramName);
  }

  public progress(): Map<string, boolean> {
    return this.program.isInProgress;
  }

  public progressCheck(): Map<string, boolean> {
    return this.program.isCheckingInstallation;
  }

  public buttonStartSysteminfo(): void {
    this.systeminfoRunProgress = true;
    this.runSysteminfo().then(() => {
      this.systeminfoOutput('Done');
      this.systeminfoRunProgress = false;
    }).catch(err => {
      this.systeminfoRunOutput = err;
      this.systeminfoRunProgress = false;
    });
  }

  public async runSysteminfo(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      let fileData: string;
      // Download file
      try {
        this.systeminfoOutput('Fetching: ' + this.systeminfosURL);
        const data = await this.utils.httpsGet(this.systeminfosURL);
        fileData = data.toString();
      } catch (err) {
        reject('Download failed'); return;
      }

      // Write file
      try {
        this.systeminfoOutput('Writing file: ' + this.systeminfoFilePath);
        await this.utils.writeTextFile(this.systeminfoFilePath, fileData, { mode: 0o755 });
      } catch (err) {
        reject('Failed to write file ' + this.systeminfoFilePath); return;
      }

      // Run
      try {
        const ticketNumber: number = this.formTicketNumber.controls.inputTicketNumber.value;
        this.systeminfoOutput('Running systeminfos.sh');
        await this.utils.execCmd('pkexec sh ' + this.systeminfoFilePath + ' ' + ticketNumber);
      } catch (err) {
        reject('Failed to execute script'); return;
      }

      resolve();
    });
  }

  public systeminfoOutput(text: string): void {
    this.systeminfoRunOutput = text;
  }
}
