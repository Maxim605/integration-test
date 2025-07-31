import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { ServiceFactory, ServiceInstance, LdapConfig, LdapUserConfig, LdapGroupConfig } from '../types';
import * as ldap from 'ldapjs';

export class LdapServiceInstance implements ServiceInstance {
  private container: StartedTestContainer | null = null;
  private connectionInfo: any = null;
  private server: ldap.Server | null = null;

  constructor(
    public name: string,
    public type: string,
    public config: LdapConfig
  ) {}

  async start(): Promise<void> {
    this.server = ldap.createServer();
    this.setupSchema();
    this.setupUsers();
    this.setupGroups();
    const port = this.config.port || 389;
    this.server.listen(port, () => {
      console.log(`LDAP сервис ${this.name} запущен на порту ${port}`);
    });

    this.connectionInfo = {
      host: 'localhost',
      port,
      baseDN: this.config.baseDN,
      url: `ldap://localhost:${port}`,
    };
    await this.waitForServer();
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close(() => {
        console.log(`LDAP сервис ${this.name} остановлен`);
      });
      this.server = null;
    }
  }

  getConnectionInfo(): any {
    return this.connectionInfo;
  }

  private setupSchema(): void {
    if (!this.server) return;

    const baseDN = this.config.baseDN;
    
    try {
      this.server.add(baseDN, {
        objectClass: ['top', 'organization'],
        o: 'Test Organization',
        name: 'Test Organization',
        cn: 'Test Organization',
        dn: baseDN,
      });

      const usersDN = `ou=users,${baseDN}`;
      this.server.add(usersDN, {
        objectClass: ['top', 'organizationalUnit'],
        ou: 'users',
        name: 'users',
        cn: 'users',
        dn: usersDN,
      });

      const groupsDN = `ou=groups,${baseDN}`;
      this.server.add(groupsDN, {
        objectClass: ['top', 'organizationalUnit'],
        ou: 'groups',
        name: 'groups',
        cn: 'groups',
        dn: groupsDN,
      });
    } catch (error) {
      console.error(`Error configuring LDAP schema: ${error}`);
    }
  }

  private setupUsers(): void {
    if (!this.server || !this.config.users) return;

    for (const user of this.config.users) {
      this.addUser(user);
    }
  }

  private addUser(userConfig: LdapUserConfig): void {
    if (!this.server) return;

    try {
      const userDN = userConfig.dn;
      const attributes: any = {
        objectClass: ['top', 'person', 'organizationalPerson', 'inetOrgPerson'],
        cn: userConfig.attributes.cn || userConfig.attributes.uid || 'Unknown',
        sn: userConfig.attributes.sn || 'Unknown',
        name: userConfig.attributes.cn || userConfig.attributes.uid || 'Unknown',
        dn: userDN,
        ...userConfig.attributes,
      };

      if (userConfig.password) {
        attributes.userPassword = userConfig.password;
      }

      this.server.add(userDN, attributes);
      console.log(`User added: ${userDN}`);
    } catch (error) {
      console.error(`Error adding user ${userConfig.dn}: ${error}`);
    }
  }

  private setupGroups(): void {
    if (!this.server || !this.config.groups) return;

    for (const group of this.config.groups) {
      this.addGroup(group);
    }
  }

  private addGroup(groupConfig: LdapGroupConfig): void {
    if (!this.server) return;

    try {
      const groupDN = groupConfig.dn;
      const cn = groupConfig.dn.split(',')[0].split('=')[1];
      const attributes = {
        objectClass: ['top', 'groupOfNames'],
        cn: cn,
        name: cn,
        dn: groupDN,
        member: groupConfig.members,
        ...groupConfig.attributes,
      };

      this.server.add(groupDN, attributes);
      console.log(`Group added: ${groupDN}`);
    } catch (error) {
      console.error(`Error adding group ${groupConfig.dn}: ${error}`);
    }
  }

  private async waitForServer(): Promise<void> {
    return new Promise((resolve) => {
      const checkServer = () => {
        if (this.server) {
          resolve();
        } else {
          setTimeout(checkServer, 100);
        }
      };
      checkServer();
    });
  }
}

export class LdapFactory implements ServiceFactory {
  async createService(config: any): Promise<ServiceInstance> {
    return new LdapServiceInstance(
      config.name,
      'ldap',
      config
    );
  }

  supports(type: string): boolean {
    return type === 'ldap';
  }
} 