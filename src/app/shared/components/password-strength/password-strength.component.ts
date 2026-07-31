import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './password-strength.component.html',
  styleUrl: './password-strength.component.scss'
})
export class PasswordStrengthComponent implements OnChanges{
  @Input() password = '';

  r = { minLength: false, uppercase: false,
        lowercase: false, digit: false, special: false };

  isValid       = false;
  strengthPercent = 0;
  strengthClass   = 'str-0';
  errorMessage    = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['password']) this.evaluate(this.password || '');
  }

  private evaluate(pwd: string) {
    this.r.minLength = pwd.length >= 8;
    this.r.uppercase = /[A-Z]/.test(pwd);
    this.r.lowercase = /[a-z]/.test(pwd);
    this.r.digit     = /[0-9]/.test(pwd);
    this.r.special   = /[@#$%&!*\-_=+?^]/.test(pwd);

    const met = Object.values(this.r).filter(Boolean).length;
    this.isValid         = met === 5;
    this.strengthPercent = (met / 5) * 100;
    this.strengthClass   = `str-${met}`;

    const missing: string[] = [];
    if (!this.r.minLength) missing.push(`encore ${8 - pwd.length} caractère(s)`);
    if (!this.r.uppercase) missing.push('une majuscule');
    if (!this.r.lowercase) missing.push('une minuscule');
    if (!this.r.digit)     missing.push('un chiffre');
    if (!this.r.special)   missing.push('un signe (@#$%!)');
    this.errorMessage = missing.length ? `Manque : ${missing.join(', ')}` : '';
  }
}
